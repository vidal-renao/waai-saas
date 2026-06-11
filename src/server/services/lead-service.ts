import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  WaaiLead,
  WaaiLeadStatus,
  WaaiLeadPriority,
  WaaiLeadSourceChannel,
  WaaiWorkspaceRole,
} from "@/types/database";
import { LeadRepository, type CreateLeadInput } from "@/server/repositories/lead-repository";
import { LeadEventRepository } from "@/server/repositories/lead-event-repository";
import { ConversationAssignmentRepository } from "@/server/repositories/conversation-assignment-repository";

type Client = SupabaseClient<Database>;

const CAN_MUTATE_ROLES: WaaiWorkspaceRole[] = [
  "owner",
  "admin",
  "agent_manager",
  "human_agent",
];

const CAN_ASSIGN_ROLES: WaaiWorkspaceRole[] = [
  "owner",
  "admin",
  "agent_manager",
];

// human_agent can only mutate leads tied to conversations assigned to them
async function assertHumanAgentLeadAccess(
  db: Client,
  lead: WaaiLead,
  actorUserId: string | null,
  userRole: WaaiWorkspaceRole
): Promise<void> {
  if (userRole !== "human_agent") return;
  if (!lead.conversation_id || !actorUserId) {
    throw new Error("FORBIDDEN: human_agent can only act on leads linked to assigned conversations");
  }
  const assignmentRepo = new ConversationAssignmentRepository(db);
  const assignment = await assignmentRepo.findActiveByConversation(lead.conversation_id);
  if (!assignment || assignment.assigned_to !== actorUserId) {
    throw new Error("FORBIDDEN: human_agent can only act on leads for their assigned conversations");
  }
}

const VALID_STATUS_TRANSITIONS: Record<WaaiLeadStatus, WaaiLeadStatus[]> = {
  new: ["qualified", "contacted", "lost", "archived"],
  qualified: ["contacted", "won", "lost", "archived"],
  contacted: ["won", "lost", "archived"],
  won: ["archived"],
  lost: ["archived"],
  archived: [],
};

export class LeadService {
  private readonly leadRepo: LeadRepository;
  private readonly eventRepo: LeadEventRepository;

  constructor(private readonly db: Client) {
    this.leadRepo = new LeadRepository(db);
    this.eventRepo = new LeadEventRepository(db);
  }

  async createLead(
    input: CreateLeadInput,
    actorUserId: string | null,
    userRole: WaaiWorkspaceRole
  ): Promise<WaaiLead> {
    if (!CAN_MUTATE_ROLES.includes(userRole)) {
      throw new Error("FORBIDDEN: Insufficient role to create lead");
    }

    const lead = await this.leadRepo.create({
      ...input,
      createdBy: actorUserId ?? undefined,
    });

    await this.eventRepo.log({
      workspaceId: input.workspaceId,
      leadId: lead.id,
      actorUserId,
      eventType: "lead_created",
      metadata: { source_channel: input.sourceChannel ?? "manual" },
    }).catch(() => null);

    return lead;
  }

  async updateStatus(
    leadId: string,
    workspaceId: string,
    newStatus: WaaiLeadStatus,
    actorUserId: string | null,
    userRole: WaaiWorkspaceRole
  ): Promise<WaaiLead> {
    if (!CAN_MUTATE_ROLES.includes(userRole)) {
      throw new Error("FORBIDDEN: Insufficient role to update lead status");
    }

    const lead = await this.leadRepo.findById(leadId, workspaceId);
    if (!lead) throw new Error("NOT_FOUND: Lead not found");

    await assertHumanAgentLeadAccess(this.db, lead, actorUserId, userRole);

    const allowed = VALID_STATUS_TRANSITIONS[lead.status];
    if (!allowed.includes(newStatus)) {
      throw new Error(`INVALID_TRANSITION: Cannot move from ${lead.status} to ${newStatus}`);
    }

    const updated = await this.leadRepo.update(leadId, workspaceId, { status: newStatus });

    await this.eventRepo.log({
      workspaceId,
      leadId,
      actorUserId,
      eventType: "lead_status_changed",
      metadata: { from: lead.status, to: newStatus },
    }).catch(() => null);

    if (newStatus === "won") {
      await this.eventRepo.log({
        workspaceId,
        leadId,
        actorUserId,
        eventType: "lead_marked_won",
      }).catch(() => null);
    } else if (newStatus === "lost") {
      await this.eventRepo.log({
        workspaceId,
        leadId,
        actorUserId,
        eventType: "lead_marked_lost",
      }).catch(() => null);
    }

    return updated;
  }

  async assignLead(
    leadId: string,
    workspaceId: string,
    assignedTo: string | null,
    actorUserId: string | null,
    userRole: WaaiWorkspaceRole
  ): Promise<WaaiLead> {
    if (!CAN_ASSIGN_ROLES.includes(userRole)) {
      throw new Error("FORBIDDEN: Insufficient role to assign lead");
    }

    const lead = await this.leadRepo.findById(leadId, workspaceId);
    if (!lead) throw new Error("NOT_FOUND: Lead not found");

    const updated = await this.leadRepo.update(leadId, workspaceId, { assignedTo });

    await this.eventRepo.log({
      workspaceId,
      leadId,
      actorUserId,
      eventType: "lead_assigned",
      metadata: { assigned_to: assignedTo },
    }).catch(() => null);

    return updated;
  }

  async updateLead(
    leadId: string,
    workspaceId: string,
    input: {
      priority?: WaaiLeadPriority;
      customerName?: string | null;
      customerPhone?: string | null;
      customerEmail?: string | null;
      companyName?: string | null;
      requestedService?: string | null;
      location?: string | null;
      desiredDate?: string | null;
      budget?: string | null;
      urgency?: string | null;
      summary?: string | null;
    },
    actorUserId: string | null,
    userRole: WaaiWorkspaceRole
  ): Promise<WaaiLead> {
    if (!CAN_MUTATE_ROLES.includes(userRole)) {
      throw new Error("FORBIDDEN: Insufficient role to update lead");
    }

    const lead = await this.leadRepo.findById(leadId, workspaceId);
    if (!lead) throw new Error("NOT_FOUND: Lead not found");

    await assertHumanAgentLeadAccess(this.db, lead, actorUserId, userRole);

    const updated = await this.leadRepo.update(leadId, workspaceId, input);

    await this.eventRepo.log({
      workspaceId,
      leadId,
      actorUserId,
      eventType: "lead_updated",
      metadata: { updated_fields: Object.keys(input) },
    }).catch(() => null);

    return updated;
  }

  async createLeadFromConversation(
    workspaceId: string,
    conversationId: string,
    agentId: string | null,
    channel: WaaiLeadSourceChannel,
    actorUserId: string | null,
    userRole: WaaiWorkspaceRole
  ): Promise<WaaiLead> {
    if (!CAN_MUTATE_ROLES.includes(userRole)) {
      throw new Error("FORBIDDEN: Insufficient role to create lead");
    }

    const existing = await this.leadRepo.findByConversation(conversationId);
    if (existing) return existing;

    return this.createLead(
      {
        workspaceId,
        conversationId,
        agentId,
        sourceChannel: channel,
        status: "new",
        priority: "medium",
        createdBy: actorUserId ?? undefined,
      },
      actorUserId,
      userRole
    );
  }
}
