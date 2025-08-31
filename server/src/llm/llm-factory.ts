import { LLMAdapter, LLMRequest, LLMResponse } from './types';
import { OpenAIAdapter } from './adapters/openai-adapter';
import { OpenRouterAdapter } from './adapters/openrouter-adapter';

export class LLMFactory {
  private adapters: Map<string, LLMAdapter> = new Map();
  private defaultAdapter!: LLMAdapter;

  constructor() {
    // Initialize OpenAI adapter
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (openaiApiKey) {
      const openaiAdapter = new OpenAIAdapter({
        apiKey: openaiApiKey,
        defaultModel: 'gpt-4o',
      });
      this.adapters.set('openai', openaiAdapter);
      this.defaultAdapter = openaiAdapter;
    }

    // Initialize OpenRouter adapter
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    if (openrouterApiKey) {
      const openrouterAdapter = new OpenRouterAdapter({
        apiKey: openrouterApiKey,
        defaultModel: 'openai/gpt-4o',
      });
      this.adapters.set('openrouter', openrouterAdapter);
      
      // Set as default if OpenAI is not available
      if (!this.defaultAdapter) {
        this.defaultAdapter = openrouterAdapter;
      }
    }

    if (!this.defaultAdapter) {
      throw new Error('No LLM adapters configured. Please set OPENAI_API_KEY or OPENROUTER_API_KEY');
    }
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const model = request.model;
    
    // If no model specified, use default adapter
    if (!model) {
      return this.defaultAdapter.generate(request);
    }

    // Try to find an adapter that supports this model
    for (const [name, adapter] of this.adapters) {
      if (adapter.supportsModel(model)) {
        return adapter.generate(request);
      }
    }

    // If no adapter supports the requested model, fall back to default
    console.warn(`Model ${model} not supported by any adapter, falling back to default`);
    return this.defaultAdapter.generate(request);
  }

  getSupportedModels(): string[] {
    const models: string[] = [];
    for (const adapter of this.adapters.values()) {
      // This is a simplified approach - in a real implementation,
      // you might want to maintain a list of supported models per adapter
      if (adapter instanceof OpenAIAdapter) {
        models.push('gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo');
             } else if (adapter instanceof OpenRouterAdapter) {
         models.push(
           'openai/gpt-4o',
           'openai/gpt-4o-mini',
           'openai/gpt-4-turbo',
           'openai/gpt-4',
           'openai/gpt-3.5-turbo',
           'anthropic/claude-3-opus',
           'anthropic/claude-3-sonnet',
           'anthropic/claude-3-haiku',
           'anthropic/claude-3.5-sonnet',
           'google/gemini-pro',
           'meta-llama/llama-3.1-70b-instruct',
           'meta-llama/llama-3.1-8b-instruct',
           'openrouter:claude-3.5-sonnet',
           'openrouter:llama-3.1-70b'
         );
      }
    }
    return [...new Set(models)]; // Remove duplicates
  }

  getDefaultModel(): string {
    return this.defaultAdapter.getDefaultModel();
  }
}
