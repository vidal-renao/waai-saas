import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiPlanId, WaaiSubscriptionStatus } from "@/types/database";
import {
  SubscriptionsRepository,
  type StripeSubscriptionState,
} from "@/server/repositories/subscriptions.repository";
import { BillingEventsRepository } from "@/server/repositories/billing-events-repository";
import { StripeService } from "@/server/services/stripe.service";
import {
  isSelfServePlan,
  priceIdForPlan,
  planIdForPrice,
} from "@/lib/billing/stripe-config";

type Client = SupabaseClient<Database>;

// Minimal view of the fields we read across heterogeneous Stripe event objects.
interface StripeEventObject {
  metadata?: Record<string, string> | null;
  client_reference_id?: string | null;
  customer?: string | Stripe.Customer | Stripe.DeletedCustomer | null;
}

/**
 * Canonical owner of subscription lifecycle. Orchestrates StripeService (SDK)
 * and the subscription/billing-event repositories. All checkout creation and
 * webhook-driven persistence flows through here — no layer bypasses it.
 */
export class SubscriptionService {
  private readonly subsRepo: SubscriptionsRepository;
  private readonly eventsRepo: BillingEventsRepository;
  private _stripe?: StripeService;

  constructor(private readonly db: Client) {
    this.subsRepo = new SubscriptionsRepository(db);
    this.eventsRepo = new BillingEventsRepository(db);
  }

  // Lazily constructed so read-only use of this service does not require Stripe
  // to be configured.
  private get stripe(): StripeService {
    if (!this._stripe) this._stripe = new StripeService();
    return this._stripe;
  }

  // ── Checkout ────────────────────────────────────────────────────────────────

  /** Create a Checkout session for upgrading a workspace to a self-serve plan. */
  async createCheckout(params: {
    workspaceId: string;
    planId: WaaiPlanId;
    email: string;
  }): Promise<{ url: string }> {
    if (!isSelfServePlan(params.planId)) {
      throw new Error(`PLAN_NOT_PURCHASABLE: ${params.planId}`);
    }
    const priceId = priceIdForPlan(params.planId);
    if (!priceId) {
      throw new Error(`PRICE_NOT_CONFIGURED: ${params.planId}`);
    }

    const sub = await this.subsRepo.findByWorkspace(params.workspaceId);
    const customerId = await this.stripe.getOrCreateCustomer({
      workspaceId: params.workspaceId,
      email: params.email,
      existingCustomerId: sub?.stripe_customer_id ?? null,
    });

    // Persist the customer id right away so later flows reuse it.
    if (sub && sub.stripe_customer_id !== customerId) {
      await this.subsRepo.updateStripeState(params.workspaceId, {
        stripeCustomerId: customerId,
      });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const { url } = await this.stripe.createCheckoutSession({
      customerId,
      priceId,
      workspaceId: params.workspaceId,
      planId: params.planId,
      successUrl: `${appUrl}/dashboard/settings/billing?status=success`,
      cancelUrl: `${appUrl}/dashboard/settings/billing?status=cancelled`,
    });
    return { url };
  }

  // ── Webhook processing ───────────────────────────────────────────────────────

  /**
   * Process a verified Stripe event with at-least-once delivery semantics.
   * Idempotency is enforced through waai_billing_events: a fully processed
   * event is skipped; a partially processed one is safely reprocessed because
   * all persistence is idempotent.
   */
  async processWebhookEvent(event: Stripe.Event): Promise<void> {
    const workspaceId = await this.resolveWorkspaceId(event);
    if (!workspaceId) {
      // Unattributable event — acknowledge without retry to avoid a redelivery
      // loop for events that are not ours to handle.
      return;
    }

    const existing = await this.eventsRepo.findByProviderEvent(
      "stripe",
      event.id
    );
    if (existing && existing.status === "processed") return;

    let eventRowId = existing?.id ?? null;
    if (!existing) {
      const { event: row, duplicate } = await this.eventsRepo.recordEvent({
        workspaceId,
        provider: "stripe",
        providerEventId: event.id,
        eventType: event.type,
        status: "received",
        metadata: { stripe_type: event.type },
      });
      if (duplicate) {
        const now = await this.eventsRepo.findByProviderEvent(
          "stripe",
          event.id
        );
        if (now?.status === "processed") return;
        eventRowId = now?.id ?? null;
      } else {
        eventRowId = row?.id ?? null;
      }
    }

    try {
      await this.dispatch(event, workspaceId);
      if (eventRowId) await this.eventsRepo.updateStatus(eventRowId, "processed");
    } catch (err) {
      if (eventRowId) await this.eventsRepo.updateStatus(eventRowId, "failed");
      throw err;
    }
  }

  private async dispatch(
    event: Stripe.Event,
    workspaceId: string
  ): Promise<void> {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        if (!subId) return;
        const sub = await this.stripe.retrieveSubscription(subId);
        await this.persistSubscription(workspaceId, sub);
        return;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await this.persistSubscription(workspaceId, sub);
        return;
      }
      default:
        // Other event types are recorded (audit) but need no state change here.
        return;
    }
  }

  private async persistSubscription(
    workspaceId: string,
    sub: Stripe.Subscription
  ): Promise<void> {
    const state = this.extractState(sub);
    // A canceled subscription reverts the workspace to the free plan while the
    // Stripe references are retained for history.
    if (sub.status === "canceled") {
      state.planId = "free";
    }
    await this.subsRepo.updateStripeState(workspaceId, state);
  }

  /** Map a Stripe subscription to our persisted state shape. */
  private extractState(sub: Stripe.Subscription): StripeSubscriptionState {
    const item = sub.items.data[0];
    const priceId = item?.price?.id ?? null;
    const planId = priceId ? planIdForPrice(priceId) ?? undefined : undefined;
    const customerId =
      typeof sub.customer === "string" ? sub.customer : sub.customer.id;

    return {
      stripeSubscriptionId: sub.id,
      stripeCustomerId: customerId,
      stripePriceId: priceId,
      planId,
      status: sub.status as WaaiSubscriptionStatus,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      currentPeriodStart: toIso(item?.current_period_start),
      currentPeriodEnd: toIso(item?.current_period_end),
    };
  }

  /** Resolve the owning workspace for any Stripe event. */
  private async resolveWorkspaceId(
    event: Stripe.Event
  ): Promise<string | null> {
    const obj = event.data.object as StripeEventObject;

    const fromMeta = obj.metadata?.workspace_id;
    if (fromMeta) return fromMeta;
    if (obj.client_reference_id) return obj.client_reference_id;

    const customer = obj.customer;
    const customerId =
      typeof customer === "string" ? customer : customer?.id ?? null;
    if (customerId) {
      const sub = await this.subsRepo.findByStripeCustomerId(customerId);
      return sub?.workspace_id ?? null;
    }
    return null;
  }
}

function toIso(seconds: number | null | undefined): string | null {
  if (typeof seconds !== "number") return null;
  return new Date(seconds * 1000).toISOString();
}
