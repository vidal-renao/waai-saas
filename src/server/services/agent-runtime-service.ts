import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  WaaiMessage,
  WaaiWorkspaceRole,
  WaaiConversationChannel,
} from "@/types/database";
import { AgentRepository } from "@/server/repositories/agent-repository";
import { AgentPromptVersionRepository } from "@/server/repositories/agent-prompt-version-repository";
import { ConversationRepository } from "@/server/repositories/conversation-repository";
import { MessageRepository } from "@/server/repositories/message-repository";
import { AgentRunRepository } from "@/server/repositories/agent-run-repository";
import { createLLMProvider } from "@/lib/llm/llm-provider";
import { RagRetrievalService } from "@/server/services/rag-retrieval-service";
import type { LLMMessage, LLMProvider } from "@/lib/llm/types";
import type { RagContext } from "@/lib/rag/rag-types";

type Client = SupabaseClient<Database>;

export type RuntimeErrorCode =
  | "FORBIDDEN"
  | "MESSAGE_LIMIT"
  | "NO_API_KEY"
  | "NO_PROMPT"
  | "AGENT_NOT_FOUND"
  | "CONVERSATION_NOT_FOUND"
  | "CLAUDE_ERROR";

export interface RuntimeError {
  error: string;
  code: RuntimeErrorCode;
}

export interface RuntimeOutput {
  conversationId: string;
  userMessage: WaaiMessage;
  assistantMessage: WaaiMessage;
  run: {
    id: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    model: string;
    metadata: Record<string, unknown>;
  };
}

export interface RuntimeInput {
  workspaceId: string;
  agentId: string;
  conversationId: string | null;
  externalConversationId?: string | null;
  userMessage: string;
  channel: WaaiConversationChannel;
  // null for WhatsApp (external customer — no internal user)
  userId: string | null;
  userRole: WaaiWorkspaceRole | null;
  metadata?: Record<string, unknown>;
}

const SANDBOX_ALLOWED_ROLES: WaaiWorkspaceRole[] = [
  "owner",
  "admin",
  "agent_manager",
  "human_agent",
];

export class AgentRuntimeService {
  private readonly agentRepo: AgentRepository;
  private readonly promptVersionRepo: AgentPromptVersionRepository;
  private readonly convRepo: ConversationRepository;
  private readonly msgRepo: MessageRepository;
  private readonly runRepo: AgentRunRepository;
  private readonly ragService: RagRetrievalService;

  constructor(private readonly db: Client) {
    this.agentRepo = new AgentRepository(db);
    this.promptVersionRepo = new AgentPromptVersionRepository(db);
    this.convRepo = new ConversationRepository(db);
    this.msgRepo = new MessageRepository(db);
    this.runRepo = new AgentRunRepository(db);
    this.ragService = new RagRetrievalService(db);
  }

  async processMessage(
    input: RuntimeInput
  ): Promise<RuntimeOutput | RuntimeError> {
    // 1. Role check — only for sandbox channel
    if (input.channel === "sandbox") {
      if (!input.userId || !input.userRole) {
        return { error: "Autenticación requerida para sandbox.", code: "FORBIDDEN" };
      }
      if (!SANDBOX_ALLOWED_ROLES.includes(input.userRole)) {
        return { error: "No tienes permisos para usar el sandbox.", code: "FORBIDDEN" };
      }
    }

    // 2. Check message limit before calling Claude
    const { data: canUse } = await this.db.rpc("waai_can_use_message", {
      p_workspace_id: input.workspaceId,
    });
    if (!canUse) {
      return {
        error: "Has alcanzado el límite mensual de mensajes. Actualiza tu plan para continuar.",
        code: "MESSAGE_LIMIT",
      };
    }

    // 3. Load agent — verify workspace ownership
    const agent = await this.agentRepo.findById(input.agentId);
    if (!agent || agent.workspace_id !== input.workspaceId) {
      return { error: "Agente no encontrado.", code: "AGENT_NOT_FOUND" };
    }

    // 4. Load active system prompt
    const activePrompt = await this.promptVersionRepo.findActiveByAgent(input.agentId);
    if (!activePrompt) {
      return {
        error: "No hay system prompt activo para este agente. Genera un prompt primero.",
        code: "NO_PROMPT",
      };
    }

    // 5. Instantiate LLM provider — fails if API key is missing
    let provider: LLMProvider;
    try {
      provider = createLLMProvider();
    } catch {
      return {
        error: "La API key de IA no está configurada. Contacta al administrador.",
        code: "NO_API_KEY",
      };
    }

    // 6. Resolve conversation
    let conversationId = input.conversationId;

    if (!conversationId && input.externalConversationId) {
      // WhatsApp: look up by external chat ID
      const existing = await this.convRepo.findByExternalConversationId(
        input.workspaceId,
        input.agentId,
        input.channel,
        input.externalConversationId
      );
      if (existing) {
        conversationId = existing.id;
      }
    }

    if (!conversationId) {
      // Create new conversation
      const conv = await this.convRepo.create({
        workspaceId: input.workspaceId,
        agentId: input.agentId,
        channel: input.channel,
        createdBy: input.userId ?? null,
        externalConversationId: input.externalConversationId ?? null,
        title:
          input.channel === "sandbox"
            ? `Test - ${agent.name}`
            : `WhatsApp · ${(input.metadata?.from_number as string) ?? ""}`,
      });
      conversationId = conv.id;
    } else {
      // Validate existing conversation belongs to this workspace/agent/channel
      const conversation = await this.convRepo.findById(conversationId);
      if (
        !conversation ||
        conversation.workspace_id !== input.workspaceId ||
        conversation.agent_id !== input.agentId ||
        conversation.channel !== input.channel
      ) {
        return {
          error: "Conversación no encontrada para este agente.",
          code: "CONVERSATION_NOT_FOUND",
        };
      }
    }

    // 7. Save user message
    const userMsg = await this.msgRepo.create({
      conversationId,
      workspaceId: input.workspaceId,
      agentId: input.agentId,
      role: "user",
      content: input.userMessage,
      channel: input.channel,
      metadata: input.metadata ?? {},
    });

    // 8. Retrieve RAG context — non-blocking, fallback to no context on error
    let ragContext: RagContext | null = null;
    let ragMetadata: Record<string, unknown> = { rag_used: false };
    try {
      const ragResult = await this.ragService.retrieveContext(
        input.workspaceId,
        input.agentId,
        input.userMessage
      );
      if ("ragError" in ragResult) {
        ragMetadata = { rag_used: false, rag_error: ragResult.ragError };
      } else {
        ragContext = ragResult;
        ragMetadata = {
          rag_used: ragResult.ragUsed,
          retrieved_chunks_count: ragResult.chunks.length,
          retrieved_document_ids: [...new Set(ragResult.chunks.map((c) => c.documentId))],
          similarity_scores: ragResult.chunks.map((c) => c.similarity),
          rag_model: ragResult.ragModel,
          rag_latency_ms: ragResult.ragLatencyMs,
        };
      }
    } catch {
      ragMetadata = { rag_used: false, rag_error: "retrieval_error" };
    }

    const systemPrompt = buildSystemPrompt(activePrompt.system_prompt, ragContext);

    // 9. Fetch conversation history
    const history = await this.msgRepo.findByConversation(conversationId, 20);
    const llmMessages: LLMMessage[] = history
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    // 10. Call Claude
    const callStart = Date.now();
    let llmOutput: Awaited<ReturnType<LLMProvider["generateResponse"]>>;
    try {
      llmOutput = await provider.generateResponse({
        systemPrompt,
        messages: llmMessages,
      });
    } catch (err) {
      const latencyMs = Date.now() - callStart;
      await this.runRepo.create({
        workspaceId: input.workspaceId,
        agentId: input.agentId,
        conversationId,
        promptVersionId: activePrompt.id,
        provider: provider.getProviderName(),
        model: provider.getDefaultModel(),
        status: "error",
        errorMessage: err instanceof Error ? err.message : "Unknown error",
        latencyMs,
        metadata: { ...ragMetadata, channel: input.channel },
      });
      return { error: "Error al procesar el mensaje. Inténtalo de nuevo.", code: "CLAUDE_ERROR" };
    }

    // 11. Save assistant message
    const assistantMsg = await this.msgRepo.create({
      conversationId,
      workspaceId: input.workspaceId,
      agentId: input.agentId,
      role: "assistant",
      content: llmOutput.content,
      channel: input.channel,
      providerMessageId: llmOutput.rawMetadata.id as string | null,
      metadata: {
        model: llmOutput.model,
        input_tokens: llmOutput.inputTokens,
        output_tokens: llmOutput.outputTokens,
      },
    });

    // 12. Save agent run
    const run = await this.runRepo.create({
      workspaceId: input.workspaceId,
      agentId: input.agentId,
      conversationId,
      promptVersionId: activePrompt.id,
      provider: llmOutput.provider,
      model: llmOutput.model,
      inputTokens: llmOutput.inputTokens,
      outputTokens: llmOutput.outputTokens,
      totalTokens: llmOutput.totalTokens,
      status: "success",
      latencyMs: (llmOutput.rawMetadata.latency_ms as number) ?? null,
      metadata: { ...llmOutput.rawMetadata, ...ragMetadata, channel: input.channel },
    });

    // 13. Update conversation last_message_at
    await this.db.rpc("waai_update_conversation_last_message", {
      p_conversation_id: conversationId,
    });

    // 14. Increment usage counter
    await this.db.rpc("waai_increment_message_counter", {
      p_workspace_id: input.workspaceId,
    });

    return {
      conversationId,
      userMessage: userMsg,
      assistantMessage: assistantMsg,
      run: {
        id: run.id,
        inputTokens: run.input_tokens ?? 0,
        outputTokens: run.output_tokens ?? 0,
        latencyMs: run.latency_ms ?? 0,
        model: run.model,
        metadata: run.metadata,
      },
    };
  }
}

// Inject RAG context into the system prompt when knowledge is available.
// See docs/prompts/03-rag-context-injection.md
function buildSystemPrompt(
  basePrompt: string,
  ragContext: RagContext | null
): string {
  if (!ragContext || !ragContext.ragUsed || !ragContext.contextText) {
    return basePrompt;
  }

  return `${basePrompt}

<business_knowledge>
A continuación encontrarás información real del negocio recuperada de la base de conocimiento.
Úsala SOLO si es relevante para responder la pregunta del usuario.

${ragContext.contextText}
</business_knowledge>

<knowledge_instructions>
- Prioriza el conocimiento del negocio anterior para responder preguntas factuales.
- Si el conocimiento no contiene la respuesta, usa el fallback definido en tu configuración.
- NO inventes precios, disponibilidades, condiciones, garantías ni datos no presentes.
- NO reveles IDs internos, chunk IDs, embeddings ni metadatos técnicos al usuario.
- Si el usuario pregunta algo fuera del alcance, responde con amabilidad y redirige.
</knowledge_instructions>`;
}
