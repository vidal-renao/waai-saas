import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  WaaiConversationAssignment,
  WaaiAssignmentStatus,
} from "@/types/database";

type AssignmentUpdateRow =
  Database["public"]["Tables"]["waai_conversation_assignments"]["Update"];
type Client = SupabaseClient<Database>;

export interface CreateAssignmentInput {
  workspaceId: string;
  conversationId: string;
  assignedTo?: string | null;
  assignedBy?: string | null;
  reason?: string | null;
}

export class ConversationAssignmentRepository {
  constructor(private readonly db: Client) {}

  async findActiveByConversation(
    conversationId: string
  ): Promise<WaaiConversationAssignment | null> {
    const { data, error } = await this.db
      .from("waai_conversation_assignments")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("status", "active")
      .limit(1)
      .single();
    if (error) return null;
    return data;
  }

  async findByConversation(
    conversationId: string,
    limit = 20
  ): Promise<WaaiConversationAssignment[]> {
    const { data, error } = await this.db
      .from("waai_conversation_assignments")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error)
      throw new Error(`ConversationAssignmentRepository.findByConversation: ${error.message}`);
    return data ?? [];
  }

  async updateStatus(
    id: string,
    status: WaaiAssignmentStatus
  ): Promise<void> {
    const patch: AssignmentUpdateRow = {
      status,
      updated_at: new Date().toISOString(),
    };
    const { error } = await this.db
      .from("waai_conversation_assignments")
      .update(patch)
      .eq("id", id);
    if (error)
      throw new Error(`ConversationAssignmentRepository.updateStatus: ${error.message}`);
  }

  async create(input: CreateAssignmentInput): Promise<WaaiConversationAssignment> {
    const { data, error } = await this.db
      .from("waai_conversation_assignments")
      .insert({
        workspace_id: input.workspaceId,
        conversation_id: input.conversationId,
        assigned_to: input.assignedTo ?? null,
        assigned_by: input.assignedBy ?? null,
        status: "active",
        reason: input.reason ?? null,
      })
      .select()
      .single();
    if (error)
      throw new Error(`ConversationAssignmentRepository.create: ${error.message}`);
    return data;
  }
}
