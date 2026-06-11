import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  WaaiLeadDetectionRun,
  WaaiLeadDetectionRunStatus,
} from "@/types/database";

type Client = SupabaseClient<Database>;

export interface CreateLeadDetectionRunInput {
  workspaceId: string;
  agentId?: string | null;
  conversationId: string;
  leadId?: string | null;
  provider?: string | null;
  model?: string | null;
  status: WaaiLeadDetectionRunStatus;
  inputMessagesCount?: number | null;
  confidenceScore?: number | null;
  detectedIntent?: string | null;
  extractedData?: Record<string, unknown>;
  errorMessage?: string | null;
  latencyMs?: number | null;
}

export class LeadDetectionRunRepository {
  constructor(private readonly db: Client) {}

  async create(input: CreateLeadDetectionRunInput): Promise<WaaiLeadDetectionRun> {
    const { data, error } = await this.db
      .from("waai_lead_detection_runs")
      .insert({
        workspace_id: input.workspaceId,
        agent_id: input.agentId ?? null,
        conversation_id: input.conversationId,
        lead_id: input.leadId ?? null,
        provider: input.provider ?? null,
        model: input.model ?? null,
        status: input.status,
        input_messages_count: input.inputMessagesCount ?? null,
        confidence_score: input.confidenceScore ?? null,
        detected_intent: input.detectedIntent ?? null,
        extracted_data: input.extractedData ?? {},
        error_message: input.errorMessage ?? null,
        latency_ms: input.latencyMs ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(`LeadDetectionRunRepository.create: ${error.message}`);
    return data;
  }

  async findByConversation(
    conversationId: string,
    limit = 10
  ): Promise<WaaiLeadDetectionRun[]> {
    const { data, error } = await this.db
      .from("waai_lead_detection_runs")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error)
      throw new Error(`LeadDetectionRunRepository.findByConversation: ${error.message}`);
    return data ?? [];
  }
}
