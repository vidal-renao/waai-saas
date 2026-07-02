export interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LLMInput {
  systemPrompt: string;
  /**
   * Optional stable system prefix (agent persona / Layer 1). When provided,
   * providers that support prompt caching mark this block as cacheable and
   * append `systemPrompt` after it as the dynamic (per-message) remainder.
   * When omitted, `systemPrompt` is used as the full, uncached system prompt.
   */
  cacheableSystemPrompt?: string;
  messages: LLMMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  metadata?: Record<string, unknown>;
}

export interface LLMOutput {
  content: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  rawMetadata: Record<string, unknown>;
}

export interface LLMProvider {
  generateResponse(input: LLMInput): Promise<LLMOutput>;
  getProviderName(): string;
  getDefaultModel(): string;
}
