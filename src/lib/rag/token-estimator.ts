// Approximation: 1 token ≈ 4 characters for English/Spanish text.
// Good enough for chunking; actual token counts verified at embedding time.
const CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function tokensToChars(tokens: number): number {
  return tokens * CHARS_PER_TOKEN;
}
