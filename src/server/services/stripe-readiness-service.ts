// Fase 8: Stripe readiness stub — no real Stripe API calls.
// Activate in Fase 9 by implementing these methods with the stripe SDK.
// See docs/architecture/40-stripe-readiness-plan.md for the activation plan.

export class StripeReadinessService {
  isEnabled(): boolean {
    return false; // Always false until Fase 9
  }

  // workspaceId and planId are intentionally unused — this is a stub
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async createCheckoutSession(workspaceId: string, planId: string): Promise<never> {
    throw new Error("NOT_IMPLEMENTED: Stripe checkout is not enabled in this phase");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async createBillingPortalSession(workspaceId: string): Promise<never> {
    throw new Error("NOT_IMPLEMENTED: Stripe billing portal is not enabled in this phase");
  }

  getConfigStatus(): { provider: string; configured: boolean; message: string } {
    const hasKey = Boolean(process.env.STRIPE_SECRET_KEY);
    const hasWebhookSecret = Boolean(process.env.STRIPE_WEBHOOK_SECRET);
    return {
      provider: "stripe",
      configured: hasKey && hasWebhookSecret,
      message: hasKey && hasWebhookSecret
        ? "Stripe keys present — activate checkout in Fase 9"
        : "Stripe keys not configured — add to .env.local when ready",
    };
  }
}
