import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  WaaiHandoff,
  WaaiHandoffRequestedBy,
  WaaiHandoffTriggerType,
  WaaiWorkspaceRole,
} from "@/types/database";
import { HandoffRepository } from "@/server/repositories/handoff-repository";
import { ConversationRepository } from "@/server/repositories/conversation-repository";
import { ConversationAssignmentRepository } from "@/server/repositories/conversation-assignment-repository";

type Client = SupabaseClient<Database>;

const CAN_REQUEST_ROLES: WaaiWorkspaceRole[] = [
  "owner",
  "admin",
  "agent_manager",
  "human_agent",
];

// human_agent may only request/resolve handoffs on conversations assigned to them
async function assertHumanAgentConversationAccess(
  db: Client,
  conversationId: string,
  actorUserId: string | null,
  userRole: WaaiWorkspaceRole
): Promise<void> {
  if (userRole !== "human_agent") return;
  if (!actorUserId) throw new Error("FORBIDDEN: human_agent requires authenticated user");
  const assignmentRepo = new ConversationAssignmentRepository(db);
  const assignment = await assignmentRepo.findActiveByConversation(conversationId);
  if (!assignment || assignment.assigned_to !== actorUserId) {
    throw new Error("FORBIDDEN: human_agent can only manage handoffs on their assigned conversations");
  }
}

export interface RequestHandoffInput {
  workspaceId: string;
  conversationId: string;
  agentId?: string | null;
  requestedBy?: WaaiHandoffRequestedBy;
  reason?: string | null;
  triggerType?: WaaiHandoffTriggerType | null;
  userRole: WaaiWorkspaceRole;
  actorUserId: string | null;
}

export class HandoffService {
  private readonly handoffRepo: HandoffRepository;
  private readonly convRepo: ConversationRepository;

  constructor(private readonly db: Client) {
    this.handoffRepo = new HandoffRepository(db);
    this.convRepo = new ConversationRepository(db);
  }

  async hasActiveHandoff(conversationId: string): Promise<boolean> {
    const h = await this.handoffRepo.findActiveByConversation(conversationId);
    return h !== null;
  }

  async getActiveHandoff(conversationId: string): Promise<WaaiHandoff | null> {
    return this.handoffRepo.findActiveByConversation(conversationId);
  }

  async requestHandoff(input: RequestHandoffInput): Promise<WaaiHandoff> {
    if (!CAN_REQUEST_ROLES.includes(input.userRole)) {
      throw new Error("FORBIDDEN: Insufficient role to request handoff");
    }

    // Validate conversation belongs to workspace
    const conv = await this.convRepo.findById(input.conversationId);
    if (!conv || conv.workspace_id !== input.workspaceId) {
      throw new Error("NOT_FOUND: Conversation not found");
    }

    // human_agent: only on assigned conversations
    await assertHumanAgentConversationAccess(this.db, input.conversationId, input.actorUserId, input.userRole);

    // Check no active handoff
    const existing = await this.handoffRepo.findActiveByConversation(input.conversationId);
    if (existing) {
      throw new Error("CONFLICT: handoff_already_active");
    }

    const handoff = await this.handoffRepo.create({
      workspaceId: input.workspaceId,
      conversationId: input.conversationId,
      agentId: input.agentId ?? null,
      requestedBy: input.requestedBy ?? "user",
      reason: input.reason ?? null,
      triggerType: input.triggerType ?? "manual",
    });

    // Pause automation
    try {
      await this.db.rpc("waai_pause_conversation_automation", {
        p_conversation_id: input.conversationId,
      });
    } catch { /* non-critical */ }

    return handoff;
  }

  async resolveHandoff(
    handoffId: string,
    workspaceId: string,
    resolvedBy: string,
    userRole: WaaiWorkspaceRole
  ): Promise<WaaiHandoff> {
    if (!CAN_REQUEST_ROLES.includes(userRole)) {
      throw new Error("FORBIDDEN: Insufficient role to resolve handoff");
    }

    const handoff = await this.handoffRepo.findById(handoffId, workspaceId);
    if (!handoff) throw new Error("NOT_FOUND: Handoff not found");
    if (!["requested", "active"].includes(handoff.status)) {
      throw new Error("BAD_REQUEST: Handoff is not active");
    }

    // human_agent: only on assigned conversations
    await assertHumanAgentConversationAccess(this.db, handoff.conversation_id, resolvedBy, userRole);

    const resolved = await this.handoffRepo.resolveHandoff(handoffId, workspaceId, resolvedBy);

    // Resume automation
    try {
      await this.db.rpc("waai_resume_conversation_automation", {
        p_conversation_id: handoff.conversation_id,
      });
    } catch { /* non-critical */ }

    return resolved;
  }

  async cancelHandoff(
    handoffId: string,
    workspaceId: string,
    userRole: WaaiWorkspaceRole
  ): Promise<WaaiHandoff> {
    if (!CAN_REQUEST_ROLES.includes(userRole)) {
      throw new Error("FORBIDDEN: Insufficient role to cancel handoff");
    }

    const handoff = await this.handoffRepo.findById(handoffId, workspaceId);
    if (!handoff) throw new Error("NOT_FOUND: Handoff not found");
    if (!["requested", "active"].includes(handoff.status)) {
      throw new Error("BAD_REQUEST: Handoff is not active");
    }

    const canceled = await this.handoffRepo.cancelHandoff(handoffId, workspaceId);

    try {
      await this.db.rpc("waai_resume_conversation_automation", {
        p_conversation_id: handoff.conversation_id,
      });
    } catch { /* non-critical */ }

    return canceled;
  }
}
