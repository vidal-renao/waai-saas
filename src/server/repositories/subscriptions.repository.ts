import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  WaaiSubscription,
  WaaiPlan,
  WaaiPlanId,
  WaaiSubscriptionStatus,
} from "@/types/database";

type Client = SupabaseClient<Database>;

export interface SubscriptionWithPlan extends WaaiSubscription {
  plan: WaaiPlan;
}

// Stripe-derived subscription state persisted from webhooks. All fields
// optional so callers patch only what changed.
export interface StripeSubscriptionState {
  planId?: WaaiPlanId;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  status?: WaaiSubscriptionStatus;
  cancelAtPeriodEnd?: boolean;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
}

export class SubscriptionsRepository {
  constructor(private readonly db: Client) {}

  async findByWorkspace(
    workspaceId: string
  ): Promise<SubscriptionWithPlan | null> {
    const { data: sub, error: subError } = await this.db
      .from("waai_subscriptions")
      .select("*")
      .eq("workspace_id", workspaceId)
      .single();

    if (subError || !sub) return null;

    const { data: plan, error: planError } = await this.db
      .from("waai_plans")
      .select("*")
      .eq("id", sub.plan_id)
      .single();

    if (planError || !plan) return null;

    return { ...sub, plan };
  }

  async findByStripeCustomerId(
    customerId: string
  ): Promise<WaaiSubscription | null> {
    const { data, error } = await this.db
      .from("waai_subscriptions")
      .select("*")
      .eq("stripe_customer_id", customerId)
      .single();
    if (error || !data) return null;
    return data;
  }

  /**
   * Persist Stripe-derived state onto a workspace's subscription. Idempotent:
   * applying the same webhook twice yields the same row. Only provided fields
   * are patched (undefined = leave unchanged).
   */
  async updateStripeState(
    workspaceId: string,
    state: StripeSubscriptionState
  ): Promise<WaaiSubscription> {
    const patch: Database["public"]["Tables"]["waai_subscriptions"]["Update"] = {
      updated_at: new Date().toISOString(),
    };
    if (state.planId !== undefined) patch.plan_id = state.planId;
    if (state.stripeCustomerId !== undefined)
      patch.stripe_customer_id = state.stripeCustomerId;
    if (state.stripeSubscriptionId !== undefined)
      patch.stripe_subscription_id = state.stripeSubscriptionId;
    if (state.stripePriceId !== undefined)
      patch.stripe_price_id = state.stripePriceId;
    if (state.status !== undefined) patch.status = state.status;
    if (state.cancelAtPeriodEnd !== undefined)
      patch.cancel_at_period_end = state.cancelAtPeriodEnd;
    if (state.currentPeriodStart !== undefined)
      patch.current_period_start = state.currentPeriodStart;
    if (state.currentPeriodEnd !== undefined)
      patch.current_period_end = state.currentPeriodEnd;

    const { data, error } = await this.db
      .from("waai_subscriptions")
      .update(patch)
      .eq("workspace_id", workspaceId)
      .select()
      .single();
    if (error)
      throw new Error(
        `SubscriptionsRepository.updateStripeState: ${error.message}`
      );
    return data;
  }

  async getAllPlans(): Promise<WaaiPlan[]> {
    const { data, error } = await this.db
      .from("waai_plans")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) throw new Error(`SubscriptionsRepository.getAllPlans: ${error.message}`);
    return data ?? [];
  }

  async createFreeSubscription(workspaceId: string): Promise<WaaiSubscription> {
    const { data, error } = await this.db
      .from("waai_subscriptions")
      .insert({ workspace_id: workspaceId, plan_id: "free" })
      .select()
      .single();

    if (error)
      throw new Error(
        `SubscriptionsRepository.createFreeSubscription: ${error.message}`
      );
    return data;
  }

  async upgradePlan(
    workspaceId: string,
    planId: WaaiPlanId
  ): Promise<WaaiSubscription> {
    const { data, error } = await this.db
      .from("waai_subscriptions")
      .update({ plan_id: planId })
      .eq("workspace_id", workspaceId)
      .select()
      .single();

    if (error)
      throw new Error(
        `SubscriptionsRepository.upgradePlan: ${error.message}`
      );
    return data;
  }

  async getCurrentMonthUsage(
    workspaceId: string
  ): Promise<{ messages_sent: number; documents_uploaded: number; agents_created: number } | null> {
    const periodMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    const { data, error } = await this.db
      .from("waai_usage_counters")
      .select("messages_sent, documents_uploaded, agents_created")
      .eq("workspace_id", workspaceId)
      .eq("period_month", periodMonth)
      .single();

    if (error) return { messages_sent: 0, documents_uploaded: 0, agents_created: 0 };
    return data;
  }
}
