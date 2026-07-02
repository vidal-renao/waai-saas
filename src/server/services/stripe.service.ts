import Stripe from "stripe";
import { getStripeConfig, type StripeConfig } from "@/lib/billing/stripe-config";

/**
 * Thin, single-responsibility wrapper around the Stripe SDK. This is the ONLY
 * module that imports `stripe` — every other layer depends on this abstraction,
 * mirroring the LLM/WhatsApp provider pattern. Business logic lives in
 * SubscriptionService, never here.
 */
export class StripeService {
  private readonly stripe: Stripe;
  private readonly config: StripeConfig;

  constructor() {
    this.config = getStripeConfig();
    this.stripe = new Stripe(this.config.secretKey);
  }

  /** Idempotently resolve a Stripe customer for a workspace. */
  async getOrCreateCustomer(params: {
    workspaceId: string;
    email: string;
    existingCustomerId?: string | null;
  }): Promise<string> {
    if (params.existingCustomerId) return params.existingCustomerId;
    const customer = await this.stripe.customers.create({
      email: params.email,
      metadata: { workspace_id: params.workspaceId },
    });
    return customer.id;
  }

  /** Create a subscription Checkout session and return its hosted URL. */
  async createCheckoutSession(params: {
    customerId: string;
    priceId: string;
    workspaceId: string;
    planId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ id: string; url: string }> {
    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      customer: params.customerId,
      line_items: [{ price: params.priceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      client_reference_id: params.workspaceId,
      metadata: { workspace_id: params.workspaceId, plan_id: params.planId },
      subscription_data: {
        metadata: { workspace_id: params.workspaceId, plan_id: params.planId },
      },
    });
    if (!session.url) {
      throw new Error("Stripe did not return a Checkout URL");
    }
    return { id: session.id, url: session.url };
  }

  /** Create a Billing Portal session (manage payment method, invoices, plan). */
  async createBillingPortalSession(params: {
    customerId: string;
    returnUrl: string;
  }): Promise<{ url: string }> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: params.customerId,
      return_url: params.returnUrl,
    });
    return { url: session.url };
  }

  /** Verify and parse an inbound webhook using the signing secret. Throws on failure. */
  constructWebhookEvent(rawBody: string, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      this.config.webhookSecret
    );
  }

  retrieveSubscription(id: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.retrieve(id);
  }
}
