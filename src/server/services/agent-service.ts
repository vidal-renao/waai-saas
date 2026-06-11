import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiAgent, WaaiWorkspaceRole } from "@/types/database";
import { AgentRepository } from "@/server/repositories/agent-repository";
import { AgentConfigRepository } from "@/server/repositories/agent-config-repository";
import { AgentEventRepository } from "@/server/repositories/agent-event-repository";
import { AgentPromptBuilderService } from "@/server/services/agent-prompt-builder-service";
import { AgentPermissionService } from "@/server/services/agent-permission-service";
import { AuditLogsRepository } from "@/server/repositories/audit-logs.repository";
import { SubscriptionsRepository } from "@/server/repositories/subscriptions.repository";
import { parseList, parseWorkingHours } from "@/lib/prompt-builder";
import type { CreateAgentWizard, UpdateAgentConfig } from "@/lib/validators/agent";

type Client = SupabaseClient<Database>;

export interface AgentLimitCheck {
  allowed: boolean;
  limit: number;
  current: number;
}

export class AgentService {
  private readonly agentRepo: AgentRepository;
  private readonly agentConfigRepo: AgentConfigRepository;
  private readonly agentEventRepo: AgentEventRepository;
  private readonly promptBuilderService: AgentPromptBuilderService;
  private readonly permissionService: AgentPermissionService;
  private readonly auditRepo: AuditLogsRepository;
  private readonly subscriptionsRepo: SubscriptionsRepository;

  constructor(private readonly db: Client) {
    this.agentRepo = new AgentRepository(db);
    this.agentConfigRepo = new AgentConfigRepository(db);
    this.agentEventRepo = new AgentEventRepository(db);
    this.promptBuilderService = new AgentPromptBuilderService(db);
    this.permissionService = new AgentPermissionService();
    this.auditRepo = new AuditLogsRepository(db);
    this.subscriptionsRepo = new SubscriptionsRepository(db);
  }

  async checkAgentLimit(workspaceId: string): Promise<AgentLimitCheck> {
    const sub = await this.subscriptionsRepo.findByWorkspace(workspaceId);
    const limit = sub?.plan.agents_limit ?? 0;
    const current = await this.agentRepo.countActiveByWorkspace(workspaceId);

    return {
      allowed: limit === -1 || current < limit,
      limit,
      current,
    };
  }

  async createAgentWithWizard(
    workspaceId: string,
    userId: string,
    role: WaaiWorkspaceRole,
    data: CreateAgentWizard
  ): Promise<WaaiAgent> {
    if (!this.permissionService.canPerformAction(role, "create")) {
      throw new Error("FORBIDDEN: insufficient permissions to create agents");
    }

    const limitCheck = await this.checkAgentLimit(workspaceId);
    if (!limitCheck.allowed) {
      throw new Error(
        `PLAN_LIMIT: agent limit reached (${limitCheck.current}/${limitCheck.limit})`
      );
    }

    // Create agent
    const agent = await this.agentRepo.create({
      workspaceId,
      createdBy: userId,
      name: data.name,
      primaryLanguage: data.primary_language,
    });

    // Create config
    const config = await this.agentConfigRepo.create({
      agentId: agent.id,
      businessName: data.business_name,
      industry: data.industry,
      country: data.country ?? null,
      city: data.city ?? null,
      tone: data.tone,
      primaryGoal: data.primary_goal,
      targetAudience: data.target_audience ?? null,
      businessDescription: data.business_description ?? null,
      openingMessage: data.opening_message ?? null,
      fallbackMessage: data.fallback_message,
      humanHandoffMessage: data.human_handoff_message ?? null,
      workingHours: parseWorkingHours(data.working_hours_raw),
      services: parseList(data.services_raw),
      serviceAreas: parseList(data.service_areas_raw),
      faqs: parseList(data.faqs_raw),
      leadCaptureFields: parseList(data.lead_capture_fields_raw),
      handoffRules: parseList(data.handoff_rules_raw),
      restrictions: parseList(data.restrictions_raw),
    });

    // Generate and save system prompt
    await this.promptBuilderService.generateAndSave(agent, config, userId);

    // Log events
    await this.agentEventRepo.log({
      workspaceId,
      agentId: agent.id,
      actorUserId: userId,
      eventType: "agent_created",
      metadata: { name: agent.name, industry: data.industry },
    });

    await this.agentEventRepo.log({
      workspaceId,
      agentId: agent.id,
      actorUserId: userId,
      eventType: "wizard_completed",
      metadata: { steps_completed: 5 },
    });

    // Increment usage counter
    await this.incrementAgentsCounter(workspaceId);

    // Audit log
    await this.auditRepo.log({
      workspaceId,
      actorUserId: userId,
      eventType: "agent.created",
      entityType: "agent",
      entityId: agent.id,
      metadata: { name: agent.name, industry: data.industry },
    });

    return agent;
  }

  async updateAgentConfig(
    agentId: string,
    workspaceId: string,
    userId: string,
    role: WaaiWorkspaceRole,
    data: UpdateAgentConfig
  ): Promise<void> {
    if (!this.permissionService.canPerformAction(role, "edit")) {
      throw new Error("FORBIDDEN: insufficient permissions to edit agents");
    }

    await this.agentConfigRepo.update(agentId, {
      businessName: data.business_name,
      industry: data.industry,
      country: data.country ?? null,
      city: data.city ?? null,
      timezone: data.timezone ?? null,
      tone: data.tone,
      primaryGoal: data.primary_goal,
      targetAudience: data.target_audience ?? null,
      businessDescription: data.business_description ?? null,
      openingMessage: data.opening_message ?? null,
      fallbackMessage: data.fallback_message ?? null,
      humanHandoffMessage: data.human_handoff_message ?? null,
      workingHours: parseWorkingHours(data.working_hours_raw),
      services: parseList(data.services_raw),
      serviceAreas: parseList(data.service_areas_raw),
      faqs: parseList(data.faqs_raw),
      leadCaptureFields: parseList(data.lead_capture_fields_raw),
      handoffRules: parseList(data.handoff_rules_raw),
      restrictions: parseList(data.restrictions_raw),
    });

    await this.agentEventRepo.log({
      workspaceId,
      agentId,
      actorUserId: userId,
      eventType: "agent_updated",
      metadata: { updated_by: userId },
    });
  }

  async archiveAgent(
    agentId: string,
    workspaceId: string,
    userId: string,
    role: WaaiWorkspaceRole
  ): Promise<void> {
    if (!this.permissionService.canPerformAction(role, "archive")) {
      throw new Error("FORBIDDEN: only owner or admin can archive agents");
    }

    await this.agentRepo.updateStatus(agentId, "archived");

    await this.agentEventRepo.log({
      workspaceId,
      agentId,
      actorUserId: userId,
      eventType: "agent_archived",
      metadata: { archived_by: userId },
    });

    await this.auditRepo.log({
      workspaceId,
      actorUserId: userId,
      eventType: "agent.archived",
      entityType: "agent",
      entityId: agentId,
      metadata: {},
    });
  }

  private async incrementAgentsCounter(workspaceId: string): Promise<void> {
    // Uses SECURITY DEFINER RPC to bypass RLS on waai_usage_counters
    await this.db.rpc("waai_increment_agent_counter", {
      p_workspace_id: workspaceId,
    });
  }
}
