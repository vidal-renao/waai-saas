import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiAgentQuestion } from "@/types/database";

type Client = SupabaseClient<Database>;

export class AgentQuestionRepository {
  constructor(private readonly db: Client) {}

  async findAll(): Promise<WaaiAgentQuestion[]> {
    const { data, error } = await this.db
      .from("waai_agent_questions")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) throw new Error(`AgentQuestionRepository.findAll: ${error.message}`);
    return data ?? [];
  }

  async findBySection(section: string): Promise<WaaiAgentQuestion[]> {
    const { data, error } = await this.db
      .from("waai_agent_questions")
      .select("*")
      .eq("section", section)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) throw new Error(`AgentQuestionRepository.findBySection: ${error.message}`);
    return data ?? [];
  }
}
