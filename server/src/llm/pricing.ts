export type PricingEntry = {
  inputPer1K: number; // USD per 1K input tokens
  outputPer1K: number; // USD per 1K output tokens
};

// Simple pricing table. Adjust as needed.
// Values are illustrative; update with your contracted pricing.
export const PRICING_TABLE: Record<string, PricingEntry> = {
  // OpenAI
  'gpt-4o': { inputPer1K: 0.005, outputPer1K: 0.015 },
  'gpt-4o-mini': { inputPer1K: 0.00015, outputPer1K: 0.0006 },

  // Anthropic Claude via OpenRouter
  'anthropic/claude-3.5-sonnet': { inputPer1K: 0.003, outputPer1K: 0.015 },
  'openrouter:claude-3.5-sonnet': { inputPer1K: 0.003, outputPer1K: 0.015 },

  // Llama via OpenRouter
  'meta-llama/llama-3.1-70b-instruct': { inputPer1K: 0.0006, outputPer1K: 0.0012 },
  'openrouter:llama-3.1-70b': { inputPer1K: 0.0006, outputPer1K: 0.0012 },
};

export function estimateCostUSD(
  model: string,
  promptTokens: number,
  completionTokens: number
): number | undefined {
  const pricing = PRICING_TABLE[model];
  if (!pricing) return undefined;
  const inputCost = (promptTokens / 1000) * pricing.inputPer1K;
  const outputCost = (completionTokens / 1000) * pricing.outputPer1K;
  const total = inputCost + outputCost;
  return Math.round(total * 10000) / 10000; // round to 4 decimals
}
