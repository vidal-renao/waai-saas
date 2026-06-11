import { AnthropicClaudeProvider } from "./anthropic-claude-provider";
import type { LLMProvider } from "./types";

export function createLLMProvider(): LLMProvider {
  return new AnthropicClaudeProvider();
}
