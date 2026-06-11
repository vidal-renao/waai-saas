import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiAgentKnowledgeSource } from "@/types/database";

type Client = SupabaseClient<Database>;

export class AgentKnowledgeSourceRepository {
  constructor(private readonly db: Client) {}

  async findByAgent(agentId: string): Promise<WaaiAgentKnowledgeSource[]> {
    const { data, error } = await this.db
      .from("waai_agent_knowledge_sources")
      .select("*")
      .eq("agent_id", agentId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (error)
      throw new Error(`AgentKnowledgeSourceRepository.findByAgent: ${error.message}`);
    return data ?? [];
  }

  async findAll(agentId: string): Promise<WaaiAgentKnowledgeSource[]> {
    const { data, error } = await this.db
      .from("waai_agent_knowledge_sources")
      .select("*")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false });
    if (error)
      throw new Error(`AgentKnowledgeSourceRepository.findAll: ${error.message}`);
    return data ?? [];
  }

  async findOne(
    agentId: string,
    documentId: string
  ): Promise<WaaiAgentKnowledgeSource | null> {
    const { data, error } = await this.db
      .from("waai_agent_knowledge_sources")
      .select("*")
      .eq("agent_id", agentId)
      .eq("document_id", documentId)
      .single();
    if (error) return null;
    return data;
  }

  async link(input: {
    workspaceId: string;
    agentId: string;
    documentId: string;
    createdBy: string;
  }): Promise<WaaiAgentKnowledgeSource> {
    const { data, error } = await this.db
      .from("waai_agent_knowledge_sources")
      .upsert(
        {
          workspace_id: input.workspaceId,
          agent_id: input.agentId,
          document_id: input.documentId,
          is_active: true,
          created_by: input.createdBy,
        },
        { onConflict: "agent_id,document_id" }
      )
      .select()
      .single();
    if (error)
      throw new Error(`AgentKnowledgeSourceRepository.link: ${error.message}`);
    return data;
  }

  async unlink(agentId: string, documentId: string): Promise<void> {
    const { error } = await this.db
      .from("waai_agent_knowledge_sources")
      .delete()
      .eq("agent_id", agentId)
      .eq("document_id", documentId);
    if (error)
      throw new Error(`AgentKnowledgeSourceRepository.unlink: ${error.message}`);
  }

  async hasAnyActiveLinks(agentId: string): Promise<boolean> {
    const { count, error } = await this.db
      .from("waai_agent_knowledge_sources")
      .select("*", { count: "exact", head: true })
      .eq("agent_id", agentId)
      .eq("is_active", true);
    if (error) return false;
    return (count ?? 0) > 0;
  }
}
