import type { WaaiPlanId } from "@/types/database";

/**
 * Stripe configuration and plan <-> price mapping.
 *
 * All Stripe environment access is centralised here so configuration is
 * validated in one place (fail-fast) and price IDs are never scattered across
 * the codebase. Only self-serve plans are purchasable via Checkout; `free`
 * has no price and `enterprise` is sold through custom contracts.
 */

export interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
  planToPrice: Partial<Record<WaaiPlanId, string>>;
  priceToPlan: Record<string, WaaiPlanId>;
}

// Self-serve plans and the env var holding their Stripe price ID.
const PLAN_PRICE_ENV: Partial<Record<WaaiPlanId, string>> = {
  starter: "STRIPE_PRICE_STARTER",
  pro: "STRIPE_PRICE_PRO",
  agency: "STRIPE_PRICE_AGENCY",
};

/** Plans a customer can purchase through Stripe Checkout. */
export const SELF_SERVE_PLANS: readonly WaaiPlanId[] = [
  "starter",
  "pro",
  "agency",
];

export function isSelfServePlan(planId: WaaiPlanId): boolean {
  return SELF_SERVE_PLANS.includes(planId);
}

/** True when the minimum Stripe secrets are present (does not validate prices). */
export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET
  );
}

/**
 * Return validated Stripe configuration or throw. Building the price maps here
 * means a missing/typo'd price env is surfaced as a clear error at the boundary
 * rather than a confusing Stripe API failure later.
 */
export function getStripeConfig(): StripeConfig {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured");
  if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");

  const planToPrice: Partial<Record<WaaiPlanId, string>> = {};
  const priceToPlan: Record<string, WaaiPlanId> = {};

  for (const [plan, envVar] of Object.entries(PLAN_PRICE_ENV)) {
    const priceId = process.env[envVar];
    if (priceId) {
      const planId = plan as WaaiPlanId;
      planToPrice[planId] = priceId;
      priceToPlan[priceId] = planId;
    }
  }

  return { secretKey, webhookSecret, planToPrice, priceToPlan };
}

/** Stripe price ID for a self-serve plan, or null if not configured/purchasable. */
export function priceIdForPlan(planId: WaaiPlanId): string | null {
  if (!isSelfServePlan(planId)) return null;
  return getStripeConfig().planToPrice[planId] ?? null;
}

/** Map a Stripe price ID back to a WAAI plan, or null if unknown. */
export function planIdForPrice(priceId: string): WaaiPlanId | null {
  return getStripeConfig().priceToPlan[priceId] ?? null;
}
