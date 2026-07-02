import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// ── Mock collaborators (constructors return these singletons) ────────────────
const mockSubsRepo = {
  findByWorkspace: vi.fn(),
  findByStripeCustomerId: vi.fn(),
  updateStripeState: vi.fn(),
};
const mockEventsRepo = {
  findByProviderEvent: vi.fn(),
  recordEvent: vi.fn(),
  updateStatus: vi.fn(),
};
const mockStripe = {
  getOrCreateCustomer: vi.fn(),
  createCheckoutSession: vi.fn(),
  retrieveSubscription: vi.fn(),
};

// Regular functions (not arrows) so they are constructable with `new`.
vi.mock("@/server/repositories/subscriptions.repository", () => ({
  SubscriptionsRepository: vi.fn(function () {
    return mockSubsRepo;
  }),
}));
vi.mock("@/server/repositories/billing-events-repository", () => ({
  BillingEventsRepository: vi.fn(function () {
    return mockEventsRepo;
  }),
}));
vi.mock("@/server/services/stripe.service", () => ({
  StripeService: vi.fn(function () {
    return mockStripe;
  }),
}));

import { SubscriptionService } from "./subscription.service";

// db is never used directly (repos are mocked) — a typed stand-in is enough.
const db = {} as Partial<SupabaseClient<Database>> as SupabaseClient<Database>;

// Stripe SDK shapes are large; fixtures cast through unknown are the standard
// test-only exception for third-party types.
function fakeSubscription(overrides: Record<string, unknown> = {}): Stripe.Subscription {
  const base = {
    id: "sub_123",
    customer: "cus_1",
    status: "active",
    cancel_at_period_end: false,
    metadata: { workspace_id: "ws_1" },
    items: {
      data: [
        {
          price: { id: "price_pro" },
          current_period_start: 1_719_000_000,
          current_period_end: 1_721_600_000,
        },
      ],
    },
    ...overrides,
  };
  return base as unknown as Stripe.Subscription;
}

function fakeEvent(type: string, object: Record<string, unknown>): Stripe.Event {
  return {
    id: "evt_1",
    type,
    data: { object },
  } as unknown as Stripe.Event;
}

describe("SubscriptionService", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_123";
    process.env.STRIPE_PRICE_PRO = "price_pro";
    process.env.NEXT_PUBLIC_APP_URL = "https://app.test";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  // ── createCheckout ──────────────────────────────────────────────────────────

  it("creates a checkout session for a self-serve plan", async () => {
    mockSubsRepo.findByWorkspace.mockResolvedValue({ stripe_customer_id: "cus_1" });
    mockStripe.getOrCreateCustomer.mockResolvedValue("cus_1");
    mockStripe.createCheckoutSession.mockResolvedValue({ id: "cs_1", url: "https://checkout" });

    const svc = new SubscriptionService(db);
    const res = await svc.createCheckout({
      workspaceId: "ws_1",
      planId: "pro",
      email: "a@b.com",
    });

    expect(res.url).toBe("https://checkout");
    expect(mockStripe.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ priceId: "price_pro", workspaceId: "ws_1", planId: "pro" })
    );
    const arg = mockStripe.createCheckoutSession.mock.calls[0][0];
    expect(arg.successUrl).toContain("/dashboard/settings/billing");
  });

  it("rejects a non-purchasable plan", async () => {
    const svc = new SubscriptionService(db);
    await expect(
      svc.createCheckout({ workspaceId: "ws_1", planId: "enterprise", email: "a@b.com" })
    ).rejects.toThrow(/PLAN_NOT_PURCHASABLE/);
  });

  // ── processWebhookEvent: idempotency ─────────────────────────────────────────

  it("skips an event already marked processed", async () => {
    mockEventsRepo.findByProviderEvent.mockResolvedValue({ id: "row_1", status: "processed" });

    const svc = new SubscriptionService(db);
    await svc.processWebhookEvent(
      fakeEvent("customer.subscription.updated", {
        metadata: { workspace_id: "ws_1" },
        customer: "cus_1",
      })
    );

    expect(mockEventsRepo.recordEvent).not.toHaveBeenCalled();
    expect(mockSubsRepo.updateStripeState).not.toHaveBeenCalled();
  });

  it("returns without recording when the workspace cannot be resolved", async () => {
    mockSubsRepo.findByStripeCustomerId.mockResolvedValue(null);

    const svc = new SubscriptionService(db);
    await svc.processWebhookEvent(
      fakeEvent("customer.subscription.updated", { customer: "cus_unknown" })
    );

    expect(mockEventsRepo.recordEvent).not.toHaveBeenCalled();
    expect(mockSubsRepo.updateStripeState).not.toHaveBeenCalled();
  });

  // ── processWebhookEvent: persistence ─────────────────────────────────────────

  it("persists subscription state on subscription.updated and marks processed", async () => {
    mockEventsRepo.findByProviderEvent.mockResolvedValue(null);
    mockEventsRepo.recordEvent.mockResolvedValue({ event: { id: "row_1" }, duplicate: false });

    const svc = new SubscriptionService(db);
    await svc.processWebhookEvent(
      fakeEvent("customer.subscription.updated", fakeSubscription() as unknown as Record<string, unknown>)
    );

    expect(mockSubsRepo.updateStripeState).toHaveBeenCalledWith(
      "ws_1",
      expect.objectContaining({
        planId: "pro",
        status: "active",
        stripePriceId: "price_pro",
        stripeSubscriptionId: "sub_123",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: new Date(1_721_600_000 * 1000).toISOString(),
      })
    );
    expect(mockEventsRepo.updateStatus).toHaveBeenCalledWith("row_1", "processed");
  });

  it("reverts to the free plan when the subscription is canceled", async () => {
    mockEventsRepo.findByProviderEvent.mockResolvedValue(null);
    mockEventsRepo.recordEvent.mockResolvedValue({ event: { id: "row_2" }, duplicate: false });

    const svc = new SubscriptionService(db);
    await svc.processWebhookEvent(
      fakeEvent(
        "customer.subscription.deleted",
        fakeSubscription({ status: "canceled" }) as unknown as Record<string, unknown>
      )
    );

    expect(mockSubsRepo.updateStripeState).toHaveBeenCalledWith(
      "ws_1",
      expect.objectContaining({ planId: "free", status: "canceled" })
    );
  });

  it("retrieves the subscription on checkout.session.completed then persists", async () => {
    mockEventsRepo.findByProviderEvent.mockResolvedValue(null);
    mockEventsRepo.recordEvent.mockResolvedValue({ event: { id: "row_3" }, duplicate: false });
    mockStripe.retrieveSubscription.mockResolvedValue(fakeSubscription());

    const svc = new SubscriptionService(db);
    await svc.processWebhookEvent(
      fakeEvent("checkout.session.completed", {
        metadata: { workspace_id: "ws_1" },
        subscription: "sub_123",
        customer: "cus_1",
      })
    );

    expect(mockStripe.retrieveSubscription).toHaveBeenCalledWith("sub_123");
    expect(mockSubsRepo.updateStripeState).toHaveBeenCalledWith(
      "ws_1",
      expect.objectContaining({ planId: "pro", stripeSubscriptionId: "sub_123" })
    );
  });

  it("marks the event failed and rethrows when dispatch throws", async () => {
    mockEventsRepo.findByProviderEvent.mockResolvedValue(null);
    mockEventsRepo.recordEvent.mockResolvedValue({ event: { id: "row_4" }, duplicate: false });
    mockStripe.retrieveSubscription.mockRejectedValue(new Error("stripe_down"));

    const svc = new SubscriptionService(db);
    await expect(
      svc.processWebhookEvent(
        fakeEvent("checkout.session.completed", {
          metadata: { workspace_id: "ws_1" },
          subscription: "sub_123",
        })
      )
    ).rejects.toThrow(/stripe_down/);
    expect(mockEventsRepo.updateStatus).toHaveBeenCalledWith("row_4", "failed");
  });
});
