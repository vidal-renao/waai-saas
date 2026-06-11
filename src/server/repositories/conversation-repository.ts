import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  WaaiConversation,
  WaaiConversationChannel,
  WaaiConversationStatus,
} from "@/types/database";

type Client = SupabaseClient<Database>;

export interface CreateConversationInput {
  workspaceId: string;
  agentId: string;
  channel?: WaaiConversationChannel;
  title?: string | null;
  createdBy?: string | null;
  externalConversationId?: string | null;
}

export class ConversationRepository {
  constructor(private readonly db: Client) {}

  async findById(id: string): Promise<WaaiConversation | null> {
    const { data, error } = await this.db
      .from("waai_conversations")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;
    return data;
  }

  async findByAgent(
    agentId: string,
    limit = 20
  ): Promise<WaaiConversation[]> {
    const { data, error } = await this.db
      .from("waai_conversations")
      .select("*")
      .eq("agent_id", agentId)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error)
      throw new Error(`ConversationRepository.findByAgent: ${error.message}`);
    return data ?? [];
  }

  async findByWorkspace(
    workspaceId: string,
    limit = 50
  ): Promise<WaaiConversation[]> {
    const { data, error } = await this.db
      .from("waai_conversations")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error)
      throw new Error(
        `ConversationRepository.findByWorkspace: ${error.message}`
      );
    return data ?? [];
  }

  async findByExternalConversationId(
    workspaceId: string,
    agentId: string,
    channel: WaaiConversationChannel,
    externalConversationId: string
  ): Promise<WaaiConversation | null> {
    const { data, error } = await this.db
      .from("waai_conversations")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("agent_id", agentId)
      .eq("channel", channel)
      .eq("external_conversation_id", externalConversationId)
      .limit(1)
      .single();
    if (error) return null;
    return data;
  }

  async create(input: CreateConversationInput): Promise<WaaiConversation> {
    const { data, error } = await this.db
      .from("waai_conversations")
      .insert({
        workspace_id: input.workspaceId,
        agent_id: input.agentId,
        channel: input.channel ?? "sandbox",
        title: input.title ?? null,
        created_by: input.createdBy ?? null,
        external_conversation_id: input.externalConversationId ?? null,
      })
      .select()
      .single();

    if (error)
      throw new Error(`ConversationRepository.create: ${error.message}`);
    return data;
  }

  async updateStatus(
    id: string,
    status: WaaiConversationStatus
  ): Promise<void> {
    const { error } = await this.db
      .from("waai_conversations")
      .update({ status })
      .eq("id", id);

    if (error)
      throw new Error(`ConversationRepository.updateStatus: ${error.message}`);
  }
}
