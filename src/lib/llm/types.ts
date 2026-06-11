export interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LLMInput {
  systemPrompt: string;
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
