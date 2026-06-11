import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiPlan, WaaiPlanId } from "@/types/database";
import { SubscriptionsRepository } from "@/server/repositories/subscriptions.repository";

type Client = SupabaseClient<Database>;

export interface PlanLimitCheck {
  allowed: boolean;
  resource: string;
  limit: number;
  current: number;
}

export class BillingService {
  private readonly subscriptionsRepo: SubscriptionsRepository;

  constructor(db: Client) {
    this.subscriptionsRepo = new SubscriptionsRepository(db);
  }

  async getActivePlan(workspaceId: string): Promise<WaaiPlan | null> {
    const sub = await this.subscriptionsRepo.findByWorkspace(workspaceId);
    return sub?.plan ?? null;
  }

  async getAllPlans(): Promise<WaaiPlan[]> {
    return this.subscriptionsRepo.getAllPlans();
  }

  async checkMessageLimit(workspaceId: string): Promise<PlanLimitCheck> {
    const sub = await this.subscriptionsRepo.findByWorkspace(workspaceId);
    const usage = await this.subscriptionsRepo.getCurrentMonthUsage(workspaceId);

    const limit = sub?.plan.messages_limit ?? 0;
    const current = usage?.messages_sent ?? 0;

    return {
      allowed: limit === -1 || current < limit,
      resource: "messages",
      limit,
      current,
    };
  }

  async checkDocumentLimit(workspaceId: string): Promise<PlanLimitCheck> {
    const sub = await this.subscriptionsRepo.findByWorkspace(workspaceId);
    const usage = await this.subscriptionsRepo.getCurrentMonthUsage(workspaceId);

    const limit = sub?.plan.documents_limit ?? 0;
    const current = usage?.documents_uploaded ?? 0;

    return {
      allowed: limit === -1 || current < limit,
      resource: "documents",
      limit,
      current,
    };
  }

  async checkAgentLimit(workspaceId: string): Promise<PlanLimitCheck> {
    const sub = await this.subscriptionsRepo.findByWorkspace(workspaceId);
    const usage = await this.subscriptionsRepo.getCurrentMonthUsage(workspaceId);

    const limit = sub?.plan.agents_limit ?? 0;
    const current = usage?.agents_created ?? 0;

    return {
      allowed: limit === -1 || current < limit,
      resource: "agents",
      limit,
      current,
    };
  }

  async isHumanHandoffEnabled(workspaceId: string): Promise<boolean> {
    const plan = await this.getActivePlan(workspaceId);
    return plan?.human_handoff_enabled ?? false;
  }

  // Stub — Stripe not implemented until Fase 7
  async upgradePlan(workspaceId: string, planId: WaaiPlanId): Promise<void> {
    await this.subscriptionsRepo.upgradePlan(workspaceId, planId);
  }
}
