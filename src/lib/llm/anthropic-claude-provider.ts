import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, LLMInput, LLMOutput } from "./types";

// Fallback model — used if ANTHROPIC_MODEL env var is not set.
// See docs/architecture/17-llm-provider-runtime.md
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const DEFAULT_MAX_TOKENS = 1024;
const TIMEOUT_MS = 30_000;

// Retry policy for transient Anthropic failures (DEBT-003).
// Backoff between attempts; length of this array = number of retries.
const RETRY_DELAYS_MS = [1000, 2000, 4000];
// HTTP statuses that are safe to retry (overloaded / rate limited / transient).
const RETRYABLE_STATUS = new Set([429, 500, 503, 529]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// A transient error is one worth retrying: a retryable HTTP status, or a
// connection/timeout error that carries no status at all.
function isRetryable(err: unknown): boolean {
  if (err instanceof Anthropic.APIError) {
    if (typeof err.status === "number") {
      return RETRYABLE_STATUS.has(err.status);
    }
    // Connection/timeout errors (APIConnectionError) have no status.
    return true;
  }
  return false;
}

export class AnthropicClaudeProvider implements LLMProvider {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }
    this.client = new Anthropic({ apiKey, timeout: TIMEOUT_MS });
    // ANTHROPIC_MODEL from env; DEFAULT_MODEL is the documented fallback
    this.model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
  }

  getProviderName(): string {
    return "anthropic";
  }

  getDefaultModel(): string {
    return this.model;
  }

  async generateResponse(input: LLMInput): Promise<LLMOutput> {
    const model = input.model ?? this.model;
    const maxTokens = input.maxTokens ?? DEFAULT_MAX_TOKENS;
    const start = Date.now();

    const response = await this.createWithRetry({
      model,
      max_tokens: maxTokens,
      system: this.buildSystem(input),
      messages: input.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const content = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    return {
      content,
      provider: "anthropic",
      model: response.model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      rawMetadata: {
        id: response.id,
        stop_reason: response.stop_reason,
        latency_ms: Date.now() - start,
        // Prompt-cache accounting (DEBT-012) — visible for cost observability.
        cache_creation_input_tokens:
          response.usage.cache_creation_input_tokens ?? 0,
        cache_read_input_tokens: response.usage.cache_read_input_tokens ?? 0,
      },
    };
  }

  /**
   * Build the Anthropic `system` parameter. When a stable cacheable prefix is
   * supplied, emit two blocks: the persona (marked ephemeral for prompt
   * caching) followed by the dynamic remainder. Otherwise a plain string.
   */
  private buildSystem(
    input: LLMInput
  ): string | Anthropic.TextBlockParam[] {
    if (!input.cacheableSystemPrompt) {
      return input.systemPrompt;
    }

    const blocks: Anthropic.TextBlockParam[] = [
      {
        type: "text",
        text: input.cacheableSystemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ];
    if (input.systemPrompt.trim().length > 0) {
      blocks.push({ type: "text", text: input.systemPrompt });
    }
    return blocks;
  }

  /**
   * Call the Messages API with exponential backoff on transient failures.
   * Non-retryable errors are surfaced immediately. After exhausting retries
   * the last error is wrapped and thrown for the runtime to record.
   */
  private async createWithRetry(
    params: Anthropic.MessageCreateParamsNonStreaming
  ): Promise<Anthropic.Message> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        return await this.client.messages.create(params);
      } catch (err) {
        lastError = err;
        if (attempt < RETRY_DELAYS_MS.length && isRetryable(err)) {
          await sleep(RETRY_DELAYS_MS[attempt]);
          continue;
        }
        break;
      }
    }

    const msg =
      lastError instanceof Error ? lastError.message : "Claude API error";
    throw new Error(`AnthropicClaudeProvider: ${msg}`);
  }
}
