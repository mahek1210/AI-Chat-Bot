import { LLMAdapter, LLMRequest, LLMResponse } from './types';
import { OpenAIAdapter } from './adapters/openai-adapter';
import { OpenRouterAdapter } from './adapters/openrouter-adapter';
import { GeminiAdapter } from './adapters/gemini-adapter';
import { AnthropicAdapter } from './adapters/anthropic-adapter';
import { LlamaAdapter } from './adapters/llama-adapter';

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

    // Initialize Gemini adapter
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      const geminiAdapter = new GeminiAdapter({
        apiKey: geminiApiKey,
        baseURL: process.env.GEMINI_BASE_URL,
        defaultModel: 'gemini-1.5-flash',
      });
      this.adapters.set('gemini', geminiAdapter);
      
      // Set as default if no other adapters are available
      if (!this.defaultAdapter) {
        this.defaultAdapter = geminiAdapter;
      }
    }

    // Initialize Anthropic adapter
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicApiKey) {
      const anthropicAdapter = new AnthropicAdapter({
        apiKey: anthropicApiKey,
        baseURL: process.env.ANTHROPIC_BASE_URL,
        defaultModel: 'claude-3-5-sonnet-20241022',
      });
      this.adapters.set('anthropic', anthropicAdapter);
      
      // Set as default if no other adapters are available
      if (!this.defaultAdapter) {
        this.defaultAdapter = anthropicAdapter;
      }
    }

    // Initialize LLaMA adapter
    const llamaApiKey = process.env.LLAMA_API_KEY;
    if (llamaApiKey) {
      const llamaAdapter = new LlamaAdapter({
        apiKey: llamaApiKey,
        baseURL: process.env.LLAMA_BASE_URL,
        defaultModel: 'meta-llama/llama-3-8b-instruct',
      });
      this.adapters.set('llama', llamaAdapter);
      
      // Set as default if no other adapters are available
      if (!this.defaultAdapter) {
        this.defaultAdapter = llamaAdapter;
      }
    }

    if (!this.defaultAdapter) {
      throw new Error('No LLM adapters configured. Please set OPENAI_API_KEY, OPENROUTER_API_KEY, GEMINI_API_KEY, ANTHROPIC_API_KEY, or LLAMA_API_KEY');
    }
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const model = request.model;
    
    // If no model specified, use default adapter
    if (!model) {
      console.log(`No model specified, using default adapter: ${this.defaultAdapter.constructor.name}`);
      return this.defaultAdapter.generate(request);
    }

    console.log(`Routing request to provider for model: ${model}`);

    // Route based on model prefix and patterns
    const adapter = this.routeModelToAdapter(model);
    
    if (adapter) {
      console.log(`✅ Using adapter: ${adapter.constructor.name} for model: ${model}`);
      return adapter.generate(request);
    }

    // If no adapter found, fall back to default
    console.warn(`❌ No adapter found for model ${model}, falling back to default: ${this.defaultAdapter.constructor.name}`);
    return this.defaultAdapter.generate(request);
  }

  private routeModelToAdapter(model: string): LLMAdapter | null {
    // OpenAI models: gpt-* or openai/*
    if (model.startsWith('gpt-') || model.startsWith('openai/')) {
      const adapter = this.adapters.get('openai');
      if (adapter) {
        console.log(`🔄 Routing to OpenAI adapter for model: ${model}`);
        return adapter;
      }
    }

    // Google Gemini models: gemini-* or google/*
    if (model.startsWith('gemini-') || model.startsWith('google/')) {
      const adapter = this.adapters.get('gemini');
      if (adapter) {
        console.log(`🔄 Routing to Gemini adapter for model: ${model}`);
        return adapter;
      }
    }

    // Anthropic Claude models: claude-* or anthropic/*
    if (model.startsWith('claude-') || model.startsWith('anthropic/')) {
      const adapter = this.adapters.get('anthropic');
      if (adapter) {
        console.log(`🔄 Routing to Anthropic adapter for model: ${model}`);
        return adapter;
      }
    }

    // Meta LLaMA models: llama-* or meta-llama/*
    if (model.startsWith('llama-') || model.startsWith('meta-llama/')) {
      const adapter = this.adapters.get('llama');
      if (adapter) {
        console.log(`🔄 Routing to LLaMA adapter for model: ${model}`);
        return adapter;
      }
    }

    // OpenRouter models: openrouter:*
    if (model.startsWith('openrouter:')) {
      const adapter = this.adapters.get('openrouter');
      if (adapter) {
        console.log(`🔄 Routing to OpenRouter adapter for model: ${model}`);
        return adapter;
      }
    }

    // Fallback: try to find an adapter that explicitly supports this model
    for (const [name, adapter] of this.adapters) {
      if (adapter.supportsModel(model)) {
        console.log(`🔄 Using explicit support from ${adapter.constructor.name} for model: ${model}`);
        return adapter;
      }
    }

    return null;
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
             } else if (adapter instanceof GeminiAdapter) {
         models.push(
           'gemini-1.5-flash',
           'gemini-1.5-pro',
           'gemini-1.0-pro',
           'gemini-1.0-pro-vision'
         );
               } else if (adapter instanceof AnthropicAdapter) {
          models.push(
            'claude-3-5-sonnet-20241022',
            'claude-3-opus-20240229',
            'claude-3-sonnet-20240229',
            'claude-3-haiku-20240307'
          );
        } else if (adapter instanceof LlamaAdapter) {
          models.push(
            'meta-llama/llama-3-8b-instruct',
            'meta-llama/llama-3-70b-instruct',
            'meta-llama/llama-3.1-8b-instruct',
            'meta-llama/llama-3.1-70b-instruct'
          );
        }
    }
    return [...new Set(models)]; // Remove duplicates
  }

  getDefaultModel(): string {
    return this.defaultAdapter.getDefaultModel();
  }
}
