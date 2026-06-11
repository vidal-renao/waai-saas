import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiInternalNote } from "@/types/database";

type Client = SupabaseClient<Database>;

export interface CreateInternalNoteInput {
  workspaceId: string;
  conversationId?: string | null;
  leadId?: string | null;
  authorUserId?: string | null;
  note: string;
  visibility?: "internal" | "owner_admin";
}

export class InternalNoteRepository {
  constructor(private readonly db: Client) {}

  async create(input: CreateInternalNoteInput): Promise<WaaiInternalNote> {
    const { data, error } = await this.db
      .from("waai_internal_notes")
      .insert({
        workspace_id: input.workspaceId,
        conversation_id: input.conversationId ?? null,
        lead_id: input.leadId ?? null,
        author_user_id: input.authorUserId ?? null,
        note: input.note,
        visibility: input.visibility ?? "internal",
      })
      .select()
      .single();
    if (error) throw new Error(`InternalNoteRepository.create: ${error.message}`);
    return data;
  }

  async findByConversation(
    conversationId: string,
    limit = 50
  ): Promise<WaaiInternalNote[]> {
    const { data, error } = await this.db
      .from("waai_internal_notes")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(limit);
    if (error) throw new Error(`InternalNoteRepository.findByConversation: ${error.message}`);
    return data ?? [];
  }

  async findByLead(leadId: string, limit = 50): Promise<WaaiInternalNote[]> {
    const { data, error } = await this.db
      .from("waai_internal_notes")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: true })
      .limit(limit);
    if (error) throw new Error(`InternalNoteRepository.findByLead: ${error.message}`);
    return data ?? [];
  }
}
