import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  isSelfServePlan,
  isStripeConfigured,
  getStripeConfig,
  priceIdForPlan,
  planIdForPrice,
} from "./stripe-config";

describe("stripe-config", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_123";
    process.env.STRIPE_PRICE_STARTER = "price_starter";
    process.env.STRIPE_PRICE_PRO = "price_pro";
    process.env.STRIPE_PRICE_AGENCY = "price_agency";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("identifies self-serve plans", () => {
    expect(isSelfServePlan("starter")).toBe(true);
    expect(isSelfServePlan("pro")).toBe(true);
    expect(isSelfServePlan("agency")).toBe(true);
    expect(isSelfServePlan("free")).toBe(false);
    expect(isSelfServePlan("enterprise")).toBe(false);
  });

  it("reports configured state from env", () => {
    expect(isStripeConfigured()).toBe(true);
    delete process.env.STRIPE_WEBHOOK_SECRET;
    expect(isStripeConfigured()).toBe(false);
  });

  it("throws when secret key is missing", () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(() => getStripeConfig()).toThrow(/STRIPE_SECRET_KEY/);
  });

  it("throws when webhook secret is missing", () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    expect(() => getStripeConfig()).toThrow(/STRIPE_WEBHOOK_SECRET/);
  });

  it("builds bidirectional plan<->price maps", () => {
    const cfg = getStripeConfig();
    expect(cfg.planToPrice.pro).toBe("price_pro");
    expect(cfg.priceToPlan["price_agency"]).toBe("agency");
  });

  it("maps plan to price and back", () => {
    expect(priceIdForPlan("pro")).toBe("price_pro");
    expect(planIdForPrice("price_starter")).toBe("starter");
  });

  it("returns null for non-purchasable or unknown mappings", () => {
    expect(priceIdForPlan("free")).toBeNull();
    expect(priceIdForPlan("enterprise")).toBeNull();
    expect(planIdForPrice("price_unknown")).toBeNull();
  });

  it("omits plans whose price env is not set", () => {
    delete process.env.STRIPE_PRICE_AGENCY;
    expect(priceIdForPlan("agency")).toBeNull();
    expect(priceIdForPlan("pro")).toBe("price_pro");
  });
});
