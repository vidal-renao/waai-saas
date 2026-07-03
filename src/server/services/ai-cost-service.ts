// Pricing is approximate as of June 2026. Update PRICING_TABLE when Anthropic changes rates.
// Source: https://www.anthropic.com/pricing

interface ModelPricing {
  inputCentsPerToken: number;
  outputCentsPerToken: number;
}

interface CostEstimate {
  estimated_cost_cents: number;
  model: string;
  input_tokens: number;
  output_tokens: number;
}

const PRICING_TABLE: Record<string, ModelPricing> = {
  // Claude Fable 5 — $10.00/MTok input, $50.00/MTok output (most capable tier)
  "claude-fable-5":     { inputCentsPerToken: 0.001, outputCentsPerToken: 0.005 },
  // Claude Haiku — $0.80/MTok input, $4.00/MTok output
  "claude-haiku-4-5-20251001": { inputCentsPerToken: 0.00008, outputCentsPerToken: 0.0004 },
  "claude-haiku-4-5":          { inputCentsPerToken: 0.00008, outputCentsPerToken: 0.0004 },
  // Claude Sonnet — $3.00/MTok input, $15.00/MTok output
  "claude-sonnet-4-6":  { inputCentsPerToken: 0.0003, outputCentsPerToken: 0.0015 },
  "claude-sonnet-4-5":  { inputCentsPerToken: 0.0003, outputCentsPerToken: 0.0015 },
  // Claude Opus — $15.00/MTok input, $75.00/MTok output
  "claude-opus-4-7":    { inputCentsPerToken: 0.0015, outputCentsPerToken: 0.0075 },
  "claude-opus-4-6":    { inputCentsPerToken: 0.0015, outputCentsPerToken: 0.0075 },
  // OpenAI embeddings — $0.02/MTok (input only)
  "text-embedding-3-small": { inputCentsPerToken: 0.000002, outputCentsPerToken: 0 },
  "text-embedding-3-large": { inputCentsPerToken: 0.000013, outputCentsPerToken: 0 },
};

const ZERO_PRICING: ModelPricing = { inputCentsPerToken: 0, outputCentsPerToken: 0 };

export class AiCostService {
  estimateCost(
    model: string,
    inputTokens: number,
    outputTokens: number
  ): CostEstimate {
    const pricing = this.getPricing(model);
    const raw =
      inputTokens * pricing.inputCentsPerToken +
      outputTokens * pricing.outputCentsPerToken;
    const estimated_cost_cents = Math.ceil(raw);

    return {
      estimated_cost_cents: Math.max(0, estimated_cost_cents),
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
    };
  }

  getPricingTable(): Record<string, ModelPricing> {
    return { ...PRICING_TABLE };
  }

  private getPricing(model: string): ModelPricing {
    if (PRICING_TABLE[model]) return PRICING_TABLE[model];
    // Partial match — e.g. "claude-haiku" matches "claude-haiku-4-5-20251001"
    const key = Object.keys(PRICING_TABLE).find((k) => model.includes(k) || k.includes(model));
    return key ? PRICING_TABLE[key] : ZERO_PRICING;
  }
}
