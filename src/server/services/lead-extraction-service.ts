import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiMessage } from "@/types/database";
import { createLLMProvider } from "@/lib/llm/llm-provider";
import { LeadDetectionRunRepository } from "@/server/repositories/lead-detection-run-repository";
import type { DetectionResult } from "@/server/services/lead-detection-service";

type Client = SupabaseClient<Database>;

const leadExtractionOutputSchema = z.object({
  is_lead: z.boolean(),
  confidence_score: z.number().min(0).max(1),
  detected_intent: z.string().nullable().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).nullable().optional(),
  customer_name: z.string().max(200).nullable().optional(),
  customer_phone: z.string().max(30).nullable().optional(),
  customer_email: z.string().nullable().optional().transform((v) => {
    if (!v) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(v) ? v : null;
  }),
  requested_service: z.string().max(200).nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  desired_date: z.string().max(100).nullable().optional(),
  budget: z.string().max(100).nullable().optional(),
  urgency: z.string().max(100).nullable().optional(),
  summary: z.string().max(300).nullable().optional(),
  handoff_recommended: z.boolean().nullable().optional(),
  handoff_reason: z.string().max(300).nullable().optional(),
});

export type LeadExtractionOutput = z.infer<typeof leadExtractionOutputSchema>;

export interface ExtractionInput {
  workspaceId: string;
  agentId?: string | null;
  conversationId: string;
  messages: WaaiMessage[];
  rulesDetected: DetectionResult;
}

export interface ExtractionResult {
  data: LeadExtractionOutput | null;
  runId: string | null;
}

export class LeadExtractionService {
  private readonly detectionRunRepo: LeadDetectionRunRepository;

  constructor(private readonly db: Client) {
    this.detectionRunRepo = new LeadDetectionRunRepository(db);
  }

  async extractWithLLM(input: ExtractionInput): Promise<ExtractionResult> {
    if (!process.env.ANTHROPIC_API_KEY) {
      return { data: null, runId: null };
    }

    let provider;
    try {
      provider = createLLMProvider();
    } catch {
      return { data: null, runId: null };
    }

    const transcript = input.messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-20)
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    const systemPrompt = `You are a precise lead extraction assistant for a WhatsApp AI Agent platform.
Your task is to analyze a conversation transcript and extract structured commercial lead information.

RULES:
- Respond ONLY with valid JSON. No markdown, no explanation, no extra text.
- Use null for fields that cannot be determined from the conversation.
- Do not invent or hallucinate data not present in the conversation.
- confidence_score should reflect how certain you are that this is a real commercial lead (0.0 to 1.0).
- detected_intent: one of quote_request, appointment_request, service_inquiry, contact_request, information_request, complaint, other
- priority: low | medium | high | urgent`;

    const userPrompt = `Analyze the following conversation and extract lead information.

CONVERSATION:
${transcript}

Respond with a single JSON object matching this exact schema:
{"is_lead":boolean,"confidence_score":number,"detected_intent":string|null,"priority":"low"|"medium"|"high"|"urgent"|null,"customer_name":string|null,"customer_phone":string|null,"customer_email":string|null,"requested_service":string|null,"location":string|null,"desired_date":string|null,"budget":string|null,"urgency":string|null,"summary":string|null,"handoff_recommended":boolean|null,"handoff_reason":string|null}`;

    const start = Date.now();
    let runId: string | null = null;

    try {
      const llmOutput = await provider.generateResponse({
        systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const latencyMs = Date.now() - start;

      // Parse JSON
      let parsed: unknown;
      try {
        parsed = JSON.parse(llmOutput.content);
      } catch {
        const run = await this.detectionRunRepo.create({
          workspaceId: input.workspaceId,
          agentId: input.agentId ?? null,
          conversationId: input.conversationId,
          provider: llmOutput.provider,
          model: llmOutput.model,
          status: "error",
          inputMessagesCount: input.messages.length,
          errorMessage: "json_parse_error",
          latencyMs,
        }).catch(() => null);
        return { data: null, runId: run?.id ?? null };
      }

      // Validate with Zod
      const validated = leadExtractionOutputSchema.safeParse(parsed);
      if (!validated.success) {
        const run = await this.detectionRunRepo.create({
          workspaceId: input.workspaceId,
          agentId: input.agentId ?? null,
          conversationId: input.conversationId,
          provider: llmOutput.provider,
          model: llmOutput.model,
          status: "error",
          inputMessagesCount: input.messages.length,
          errorMessage: "zod_validation_error",
          latencyMs,
        }).catch(() => null);
        return { data: null, runId: run?.id ?? null };
      }

      const extractionData = validated.data;
      const runStatus = extractionData.is_lead ? "success" : "no_lead";

      const run = await this.detectionRunRepo.create({
        workspaceId: input.workspaceId,
        agentId: input.agentId ?? null,
        conversationId: input.conversationId,
        provider: llmOutput.provider,
        model: llmOutput.model,
        status: runStatus,
        inputMessagesCount: input.messages.length,
        confidenceScore: extractionData.confidence_score,
        detectedIntent: extractionData.detected_intent ?? null,
        extractedData: extractionData as Record<string, unknown>,
        latencyMs,
      }).catch(() => null);
      runId = run?.id ?? null;

      return { data: extractionData, runId };
    } catch {
      const latencyMs = Date.now() - start;
      const run = await this.detectionRunRepo.create({
        workspaceId: input.workspaceId,
        agentId: input.agentId ?? null,
        conversationId: input.conversationId,
        status: "error",
        inputMessagesCount: input.messages.length,
        errorMessage: "llm_call_error",
        latencyMs,
      }).catch(() => null);
      return { data: null, runId: run?.id ?? null };
    }
  }
}
