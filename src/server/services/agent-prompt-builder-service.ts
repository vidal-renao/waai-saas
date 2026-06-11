import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiAgent, WaaiAgentConfig, WaaiAgentPromptVersion } from "@/types/database";
import { AgentPromptVersionRepository } from "@/server/repositories/agent-prompt-version-repository";
import { AgentEventRepository } from "@/server/repositories/agent-event-repository";
import { buildSystemPrompt } from "@/lib/prompt-builder";

type Client = SupabaseClient<Database>;

export class AgentPromptBuilderService {
  private readonly promptVersionRepo: AgentPromptVersionRepository;
  private readonly agentEventRepo: AgentEventRepository;

  constructor(db: Client) {
    this.promptVersionRepo = new AgentPromptVersionRepository(db);
    this.agentEventRepo = new AgentEventRepository(db);
  }

  buildFromConfig(agent: WaaiAgent, config: WaaiAgentConfig): string {
    return buildSystemPrompt({
      agentName: agent.name,
      businessName: config.business_name,
      industry: config.industry,
      primaryLanguage: agent.primary_language,
      tone: config.tone,
      primaryGoal: config.primary_goal,
      targetAudience: config.target_audience ?? undefined,
      businessDescription: config.business_description ?? undefined,
      services: (config.services as string[]) ?? [],
      serviceAreas: (config.service_areas as string[]) ?? [],
      workingHoursRaw:
        ((config.working_hours as Record<string, unknown>)?.raw as string) ?? undefined,
      faqs: (config.faqs as string[]) ?? [],
      leadCaptureFields: (config.lead_capture_fields as string[]) ?? [],
      handoffRules: (config.handoff_rules as string[]) ?? [],
      fallbackMessage: config.fallback_message ?? "Lo siento, no tengo esa información. Por favor contacta con nuestro equipo.",
      humanHandoffMessage: config.human_handoff_message ?? undefined,
      restrictions: (config.restrictions as string[]) ?? [],
      openingMessage: config.opening_message ?? undefined,
    });
  }

  async generateAndSave(
    agent: WaaiAgent,
    config: WaaiAgentConfig,
    userId: string
  ): Promise<WaaiAgentPromptVersion> {
    const systemPrompt = this.buildFromConfig(agent, config);

    // Deactivate previous versions
    await this.promptVersionRepo.deactivateAll(agent.id);

    // Get next version number
    const version = await this.promptVersionRepo.getNextVersion(agent.id);

    // Save new version
    const promptVersion = await this.promptVersionRepo.create({
      agentId: agent.id,
      version,
      systemPrompt,
      promptMetadata: {
        generated_by: "local_builder",
        generated_at: new Date().toISOString(),
        agent_language: agent.primary_language,
        agent_tone: config.tone,
      },
      generatedBy: userId,
    });

    // Log event
    await this.agentEventRepo.log({
      workspaceId: agent.workspace_id,
      agentId: agent.id,
      actorUserId: userId,
      eventType: "prompt_generated",
      metadata: { version, generated_by: "local_builder" },
    });

    return promptVersion;
  }
}
