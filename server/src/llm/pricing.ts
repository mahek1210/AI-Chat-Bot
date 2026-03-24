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

  // Google Gemini
  'gemini-2.5-flash': { inputPer1K: 0.000075, outputPer1K: 0.0003 },
  'gemini-2.0-flash': { inputPer1K: 0.00375, outputPer1K: 0.015 },

  // Anthropic Claude (Direct)
  'claude-3-5-sonnet-20241022': { inputPer1K: 0.003, outputPer1K: 0.015 },
  'claude-3-opus-20240229': { inputPer1K: 0.015, outputPer1K: 0.075 },
  'claude-3-sonnet-20240229': { inputPer1K: 0.003, outputPer1K: 0.015 },
  'claude-3-haiku-20240307': { inputPer1K: 0.00025, outputPer1K: 0.00125 },

  // Anthropic Claude via OpenRouter
  'anthropic/claude-3.5-sonnet': { inputPer1K: 0.003, outputPer1K: 0.015 },
  'openrouter:claude-3.5-sonnet': { inputPer1K: 0.003, outputPer1K: 0.015 },

  // New OpenRouter Models
  // New OpenRouter Models
  'openrouter:nvidia/nemotron-3-super-120b-a12b:free': { inputPer1K: 0.002, outputPer1K: 0.004 },
  'openrouter:qwen/qwen3-next-80b-a3b-instruct:free': { inputPer1K: 0.001, outputPer1K: 0.002 },
  'openrouter:google/gemma-3n-e2b-it:free': { inputPer1K: 0.0005, outputPer1K: 0.001 },
  'openrouter:nousresearch/hermes-3-llama-3.1-405b:free': { inputPer1K: 0.003, outputPer1K: 0.006 },
  'openrouter:arcee-ai/maestro-reasoning': { inputPer1K: 0.004, outputPer1K: 0.004 }, // Estimating pricing
  'openrouter:mistralai/mistral-small-3.1-24b-instruct:free': { inputPer1K: 0.001, outputPer1K: 0.002 },
  'openrouter:arcee-ai/trinity-large-preview:free': { inputPer1K: 0.001, outputPer1K: 0.002 },
  'openrouter/auto': { inputPer1K: 0.001, outputPer1K: 0.002 },
  'openrouter:cognitivecomputations/dolphin-mistral-24b-venice-edition:free': { inputPer1K: 0.001, outputPer1K: 0.002 },

  // Llama via OpenRouter
  'meta-llama/llama-3.1-70b-instruct': { inputPer1K: 0.0006, outputPer1K: 0.0012 },
  'openrouter:llama-3.1-70b': { inputPer1K: 0.0006, outputPer1K: 0.0012 },
  
  // LLaMA Direct
  'meta-llama/llama-3-8b-instruct': { inputPer1K: 0.0002, outputPer1K: 0.0004 },
  'meta-llama/llama-3-70b-instruct': { inputPer1K: 0.0006, outputPer1K: 0.0012 },
  'meta-llama/llama-3.1-8b-instruct': { inputPer1K: 0.0002, outputPer1K: 0.0004 },
};

export function estimateCostUSD(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  let pricing = PRICING_TABLE[model];
  
  // Real world logic fallback for missing pricing
  if (!pricing) {
    if (model.toLowerCase().endsWith(':free') || model === 'openrouter/free' || model === 'openrouter/auto') {
       return 0; // Fallback for truly untracked free routers if any
    }
    // Realistic fallback average for open models ($0.50 input / $1.50 output per 1M)
    pricing = { inputPer1K: 0.0005, outputPer1K: 0.0015 };
  }
  
  const inputCost = (promptTokens / 1000) * pricing.inputPer1K;
  const outputCost = (completionTokens / 1000) * pricing.outputPer1K;
  const total = inputCost + outputCost;
  return Math.round(total * 10000) / 10000; // round to 4 decimals
}
