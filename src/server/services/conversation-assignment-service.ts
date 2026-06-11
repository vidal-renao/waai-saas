import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  WaaiConversationAssignment,
  WaaiWorkspaceRole,
} from "@/types/database";
import { ConversationAssignmentRepository } from "@/server/repositories/conversation-assignment-repository";
import { ConversationRepository } from "@/server/repositories/conversation-repository";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";

type Client = SupabaseClient<Database>;

const CAN_ASSIGN_ROLES: WaaiWorkspaceRole[] = [
  "owner",
  "admin",
  "agent_manager",
];

export class ConversationAssignmentService {
  private readonly assignRepo: ConversationAssignmentRepository;
  private readonly convRepo: ConversationRepository;
  private readonly membersRepo: WorkspaceMembersRepository;

  constructor(private readonly db: Client) {
    this.assignRepo = new ConversationAssignmentRepository(db);
    this.convRepo = new ConversationRepository(db);
    this.membersRepo = new WorkspaceMembersRepository(db);
  }

  async assignConversation(
    workspaceId: string,
    conversationId: string,
    assignedTo: string,
    assignedBy: string,
    reason: string | null,
    userRole: WaaiWorkspaceRole
  ): Promise<WaaiConversationAssignment> {
    if (!CAN_ASSIGN_ROLES.includes(userRole)) {
      throw new Error("FORBIDDEN: Insufficient role to assign conversation");
    }

    // Validate conversation belongs to workspace
    const conv = await this.convRepo.findById(conversationId);
    if (!conv || conv.workspace_id !== workspaceId) {
      throw new Error("NOT_FOUND: Conversation not found");
    }

    // Validate assignee is a workspace member
    const members = await this.membersRepo.findByWorkspace(workspaceId);
    const isMember = members.some((m) => m.user_id === assignedTo);
    if (!isMember) {
      throw new Error("BAD_REQUEST: Assignee is not a workspace member");
    }

    // Close existing active assignment
    const existing = await this.assignRepo.findActiveByConversation(conversationId);
    if (existing) {
      await this.assignRepo.updateStatus(existing.id, "transferred");
    }

    return this.assignRepo.create({
      workspaceId,
      conversationId,
      assignedTo,
      assignedBy,
      reason,
    });
  }

  async getActiveAssignment(conversationId: string): Promise<WaaiConversationAssignment | null> {
    return this.assignRepo.findActiveByConversation(conversationId);
  }
}
