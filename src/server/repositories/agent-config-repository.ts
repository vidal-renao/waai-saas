import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiAgentConfig } from "@/types/database";

type Client = SupabaseClient<Database>;

export interface CreateAgentConfigInput {
  agentId: string;
  businessName: string;
  industry: string;
  country?: string | null;
  city?: string | null;
  timezone?: string | null;
  tone?: string;
  primaryGoal: string;
  targetAudience?: string | null;
  businessDescription?: string | null;
  openingMessage?: string | null;
  fallbackMessage?: string | null;
  humanHandoffMessage?: string | null;
  workingHours?: Record<string, unknown>;
  serviceAreas?: unknown[];
  services?: unknown[];
  faqs?: unknown[];
  leadCaptureFields?: unknown[];
  handoffRules?: unknown[];
  restrictions?: unknown[];
}

export class AgentConfigRepository {
  constructor(private readonly db: Client) {}

  async findByAgent(agentId: string): Promise<WaaiAgentConfig | null> {
    const { data, error } = await this.db
      .from("waai_agent_configs")
      .select("*")
      .eq("agent_id", agentId)
      .single();

    if (error) return null;
    return data;
  }

  async create(input: CreateAgentConfigInput): Promise<WaaiAgentConfig> {
    const { data, error } = await this.db
      .from("waai_agent_configs")
      .insert({
        agent_id: input.agentId,
        business_name: input.businessName,
        industry: input.industry,
        country: input.country ?? null,
        city: input.city ?? null,
        timezone: input.timezone ?? null,
        tone: input.tone ?? "professional",
        primary_goal: input.primaryGoal,
        target_audience: input.targetAudience ?? null,
        business_description: input.businessDescription ?? null,
        opening_message: input.openingMessage ?? null,
        fallback_message: input.fallbackMessage ?? null,
        human_handoff_message: input.humanHandoffMessage ?? null,
        working_hours: input.workingHours ?? {},
        service_areas: input.serviceAreas ?? [],
        services: input.services ?? [],
        faqs: input.faqs ?? [],
        lead_capture_fields: input.leadCaptureFields ?? [],
        handoff_rules: input.handoffRules ?? [],
        restrictions: input.restrictions ?? [],
      })
      .select()
      .single();

    if (error) throw new Error(`AgentConfigRepository.create: ${error.message}`);
    return data;
  }

  async update(
    agentId: string,
    input: Omit<CreateAgentConfigInput, "agentId">
  ): Promise<WaaiAgentConfig> {
    const { data, error } = await this.db
      .from("waai_agent_configs")
      .update({
        business_name: input.businessName,
        industry: input.industry,
        country: input.country ?? null,
        city: input.city ?? null,
        timezone: input.timezone ?? null,
        tone: input.tone ?? "professional",
        primary_goal: input.primaryGoal,
        target_audience: input.targetAudience ?? null,
        business_description: input.businessDescription ?? null,
        opening_message: input.openingMessage ?? null,
        fallback_message: input.fallbackMessage ?? null,
        human_handoff_message: input.humanHandoffMessage ?? null,
        working_hours: input.workingHours ?? {},
        service_areas: input.serviceAreas ?? [],
        services: input.services ?? [],
        faqs: input.faqs ?? [],
        lead_capture_fields: input.leadCaptureFields ?? [],
        handoff_rules: input.handoffRules ?? [],
        restrictions: input.restrictions ?? [],
      })
      .eq("agent_id", agentId)
      .select()
      .single();

    if (error) throw new Error(`AgentConfigRepository.update: ${error.message}`);
    return data;
  }
}
