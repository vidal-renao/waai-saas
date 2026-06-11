import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, LLMInput, LLMOutput } from "./types";

// Fallback model — used if ANTHROPIC_MODEL env var is not set.
// See docs/architecture/17-llm-provider-runtime.md
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const DEFAULT_MAX_TOKENS = 1024;
const TIMEOUT_MS = 30_000;

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

    let response: Anthropic.Message;
    try {
      response = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        system: input.systemPrompt,
        messages: input.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Claude API error";
      throw new Error(`AnthropicClaudeProvider: ${msg}`);
    }

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
      },
    };
  }
}
