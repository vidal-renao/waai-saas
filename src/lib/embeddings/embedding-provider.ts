import { OpenAIEmbeddingProvider } from "./openai-embedding-provider";
import type { EmbeddingProvider } from "./types";

export function createEmbeddingProvider(): EmbeddingProvider {
  return new OpenAIEmbeddingProvider();
}
