import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { SubscriptionsRepository } from "@/server/repositories/subscriptions.repository";
import { AgentRepository } from "@/server/repositories/agent-repository";
import { KnowledgeDocumentRepository } from "@/server/repositories/knowledge-document-repository";
import { WhatsappConnectionRepository } from "@/server/repositories/whatsapp-connection-repository";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import type { UsageSnapshot } from "@/lib/billing/types";

type Client = SupabaseClient<Database>;

export class BillingEnforcementService {
  private readonly subscriptionsRepo: SubscriptionsRepository;
  private readonly agentRepo: AgentRepository;
  private readonly docRepo: KnowledgeDocumentRepository;
  private readonly waRepo: WhatsappConnectionRepository;
  private readonly membersRepo: WorkspaceMembersRepository;

  constructor(db: Client) {
    this.subscriptionsRepo = new SubscriptionsRepository(db);
    this.agentRepo = new AgentRepository(db);
    this.docRepo = new KnowledgeDocumentRepository(db);
    this.waRepo = new WhatsappConnectionRepository(db);
    this.membersRepo = new WorkspaceMembersRepository(db);
  }

  async assertCanCreateAgent(workspaceId: string): Promise<void> {
    const sub = await this.subscriptionsRepo.findByWorkspace(workspaceId);
    this.assertActiveSubscription(sub);
    const limit = sub!.plan.agents_limit;
    if (limit === -1) return;
    const current = await this.agentRepo.countActiveByWorkspace(workspaceId);
    if (current >= limit) {
      throw new Error(`PLAN_LIMIT: agents limit reached (${current}/${limit})`);
    }
  }

  async assertCanSendMessage(workspaceId: string): Promise<void> {
    const sub = await this.subscriptionsRepo.findByWorkspace(workspaceId);
    this.assertActiveSubscription(sub);
    const limit = sub!.plan.messages_limit;
    if (limit === -1) return;
    const usage = await this.subscriptionsRepo.getCurrentMonthUsage(workspaceId);
    const current = usage?.messages_sent ?? 0;
    if (current >= limit) {
      throw new Error(`PLAN_LIMIT: messages limit reached (${current}/${limit})`);
    }
  }

  async assertCanCreateKnowledgeDocument(workspaceId: string): Promise<void> {
    const sub = await this.subscriptionsRepo.findByWorkspace(workspaceId);
    this.assertActiveSubscription(sub);
    const limit = sub!.plan.documents_limit;
    if (limit === -1) return;
    const docs = await this.docRepo.findByWorkspace(workspaceId, 10000);
    const current = docs.filter((d) => d.status !== "archived").length;
    if (current >= limit) {
      throw new Error(`PLAN_LIMIT: documents limit reached (${current}/${limit})`);
    }
  }

  async assertCanCreateWhatsappConnection(workspaceId: string): Promise<void> {
    const sub = await this.subscriptionsRepo.findByWorkspace(workspaceId);
    this.assertActiveSubscription(sub);
    const limit = sub!.plan.whatsapp_numbers_limit;
    if (limit === -1) return;
    if (limit === 0) {
      throw new Error(`PLAN_LIMIT: whatsapp connections not available on this plan`);
    }
    const connections = await this.waRepo.findByWorkspace(workspaceId);
    const current = connections.filter((c) => c.status !== "archived").length;
    if (current >= limit) {
      throw new Error(`PLAN_LIMIT: whatsapp connections limit reached (${current}/${limit})`);
    }
  }

  async assertHumanHandoffEnabled(workspaceId: string): Promise<void> {
    const sub = await this.subscriptionsRepo.findByWorkspace(workspaceId);
    this.assertActiveSubscription(sub);
    if (!sub!.plan.human_handoff_enabled) {
      throw new Error("PLAN_LIMIT: human handoff not available on this plan");
    }
  }

  async getUsageSnapshot(workspaceId: string): Promise<UsageSnapshot> {
    const [sub, usage, agents, docs, waConns, memberCount] = await Promise.all([
      this.subscriptionsRepo.findByWorkspace(workspaceId),
      this.subscriptionsRepo.getCurrentMonthUsage(workspaceId),
      this.agentRepo.countActiveByWorkspace(workspaceId),
      this.docRepo.findByWorkspace(workspaceId, 10000),
      this.waRepo.findByWorkspace(workspaceId),
      this.membersRepo.countByWorkspace(workspaceId),
    ]);

    const activeDocCount = docs.filter((d) => d.status !== "archived").length;
    const activeWaCount = waConns.filter((c) => c.status !== "archived").length;

    return {
      workspaceId,
      periodMonth: new Date().toISOString().slice(0, 7),
      messagesSent: usage?.messages_sent ?? 0,
      messagesLimit: sub?.plan.messages_limit ?? 0,
      documentsUploaded: activeDocCount,
      documentsLimit: sub?.plan.documents_limit ?? 0,
      agentsCreated: agents,
      agentsLimit: sub?.plan.agents_limit ?? 0,
      whatsappConnections: activeWaCount,
      whatsappConnectionsLimit: sub?.plan.whatsapp_numbers_limit ?? 0,
      planId: sub?.plan_id ?? "free",
      planName: sub?.plan.name ?? "free",
      subscriptionStatus: sub ? "active" : "inactive",
      membersCount: memberCount,
    };
  }

  private assertActiveSubscription(
    sub: Awaited<ReturnType<SubscriptionsRepository["findByWorkspace"]>>
  ): void {
    if (!sub) throw new Error("PLAN_LIMIT: no active subscription found");
  }
}
