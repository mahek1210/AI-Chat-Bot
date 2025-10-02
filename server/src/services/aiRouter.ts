import { LLMRequest, LLMResponse } from '../llm/types';
import { OpenAIService } from './openaiService';
import { GeminiService } from './geminiService';
import { ClaudeService } from './claudeService';
import { OpenRouterService } from './openrouterService';

/**
 * AIRouter class that handles routing requests to the appropriate AI provider
 * based on the model name pattern.
 */
export class AIRouter {
  private openaiService: OpenAIService | null = null;
  private geminiService: GeminiService | null = null;
  private claudeService: ClaudeService | null = null;
  private openRouterService: OpenRouterService | null = null;

  constructor() {
    // Only initialize services if their API keys are configured
    if (process.env.OPENAI_API_KEY) {
      try {
        this.openaiService = new OpenAIService();
      } catch (error) {
        console.warn('OpenAI service initialization failed:', error);
      }
    }
    
    if (process.env.GEMINI_API_KEY) {
      try {
        this.geminiService = new GeminiService();
      } catch (error) {
        console.warn('Gemini service initialization failed:', error);
      }
    }
    
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        this.claudeService = new ClaudeService();
      } catch (error) {
        console.warn('Claude service initialization failed:', error);
      }
    }
    
    if (process.env.OPENROUTER_API_KEY) {
      try {
        this.openRouterService = new OpenRouterService();
      } catch (error) {
        console.warn('OpenRouter service initialization failed:', error);
      }
    }
  }

  /**
   * Detects the appropriate provider based on the model name
   * @param model The model name to route
   * @returns The provider name as a string
   */
  public detectProvider(model: string): string {
    if (!model) {
      throw new Error('Model name is required for provider detection');
    }

    // OpenAI models: gpt-* or openai/*
    if (model.startsWith('gpt-') || model.startsWith('openai/')) {
      return 'openai';
    }

    // Google Gemini models: gemini-* or google/*
    if (model.startsWith('gemini-') || model.startsWith('google/')) {
      return 'gemini';
    }

    // Anthropic Claude models: claude-* or anthropic/*
    if (model.startsWith('claude-') || model.startsWith('anthropic/')) {
      return 'claude';
    }

    // Meta LLaMA models: meta-llama/* or llama-*
    if (model.startsWith('meta-llama/') || model.startsWith('llama-')) {
      return 'openrouter';
    }

    // OpenRouter models: openrouter:*
    if (model.startsWith('openrouter:')) {
      return 'openrouter';
    }

    // If no pattern matches, throw an error
    throw new Error(`Unsupported model: ${model}. Cannot determine provider.`);
  }

  /**
   * Validates that the required API key is available for the selected provider
   * @param provider The provider name
   * @throws Error if the API key is missing
   */
  public validateApiKey(provider: string): void {
    switch (provider) {
      case 'openai':
        if (!process.env.OPENAI_API_KEY) {
          throw new Error('OPENAI_API_KEY is required for OpenAI models');
        }
        break;
      case 'gemini':
        if (!process.env.GEMINI_API_KEY) {
          throw new Error('GEMINI_API_KEY is required for Gemini models');
        }
        break;
      case 'claude':
        if (!process.env.ANTHROPIC_API_KEY) {
          throw new Error('ANTHROPIC_API_KEY is required for Claude models');
        }
        break;
      case 'openrouter':
        if (!process.env.OPENROUTER_API_KEY) {
          throw new Error('OPENROUTER_API_KEY is required for OpenRouter models');
        }
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Routes the request to the appropriate service based on the model name
   * @param request The LLM request to process
   * @returns A promise resolving to the LLM response
   */
  public async routeRequest(request: LLMRequest): Promise<LLMResponse> {
    if (!request.model) {
      throw new Error('Model name is required for routing');
    }

    const provider = this.detectProvider(request.model);
    console.log(`🔄 Routing request to ${provider} provider for model: ${request.model}`);
    
    // Validate that the API key is available
    this.validateApiKey(provider);

    // Route to the appropriate service with fallback handling
    try {
      switch (provider) {
        case 'openai':
          if (!this.openaiService) throw new Error('OpenAI service not initialized');
          return await this.openaiService.generate(request);
        case 'gemini':
          if (!this.geminiService) throw new Error('Gemini service not initialized');
          return await this.geminiService.generate(request);
        case 'claude':
          if (!this.claudeService) throw new Error('Claude service not initialized');
          return await this.claudeService.generate(request);
        case 'openrouter':
          if (!this.openRouterService) throw new Error('OpenRouter service not initialized');
          return await this.openRouterService.generate(request);
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }
    } catch (error) {
      console.error(`❌ Error with ${provider} provider for model ${request.model}:`, error instanceof Error ? error.message : error);
      
      // Handle OpenAI quota errors with OpenRouter fallback
      if (provider === 'openai' && this.isQuotaError(error)) {
        console.log(`⚠️ OpenAI quota exceeded, attempting OpenRouter fallback...`);
        return await this.fallbackToOpenRouter(request);
      }
      
      throw error;
    }
  }

  /**
   * Check if error is a quota/billing error
   */
  private isQuotaError(error: any): boolean {
    const errorMsg = error?.message || error?.toString() || '';
    return errorMsg.includes('429') || 
           errorMsg.includes('quota') || 
           errorMsg.includes('insufficient_quota') ||
           errorMsg.includes('billing');
  }

  /**
   * Fallback to OpenRouter when OpenAI quota is exceeded
   */
  private async fallbackToOpenRouter(request: LLMRequest): Promise<LLMResponse> {
    if (!this.openRouterService) {
      throw new Error('OpenRouter service not available for fallback');
    }

    // Map OpenAI model to OpenRouter equivalent
    const openRouterModel = this.mapToOpenRouterModel(request.model!);
    console.log(`🔄 Falling back to OpenRouter with model: ${openRouterModel}`);

    const fallbackRequest: LLMRequest = {
      ...request,
      model: openRouterModel,
    };

    try {
      const response = await this.openRouterService.generate(fallbackRequest);
      console.log(`✅ OpenRouter fallback successful`);
      return response;
    } catch (error) {
      console.error(`❌ OpenRouter fallback failed:`, error);
      throw new Error(`OpenAI quota exceeded and OpenRouter fallback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Map OpenAI model names to OpenRouter equivalents
   */
  private mapToOpenRouterModel(openaiModel: string): string {
    const mapping: Record<string, string> = {
      'gpt-4o': 'openai/gpt-4o',
      'gpt-4o-mini': 'openai/gpt-4o-mini',
      'gpt-4-turbo': 'openai/gpt-4-turbo',
      'gpt-4': 'openai/gpt-4',
      'gpt-3.5-turbo': 'openai/gpt-3.5-turbo',
    };

    return mapping[openaiModel] || `openai/${openaiModel}`;
  }

  /**
   * Gets a list of all supported models across all providers
   * @returns Array of supported model names
   */
  public getSupportedModels(): string[] {
    const models: string[] = [];
    
    // Collect models from each service
    if (this.openaiService) models.push(...this.openaiService.getSupportedModels());
    if (this.geminiService) models.push(...this.geminiService.getSupportedModels());
    if (this.claudeService) models.push(...this.claudeService.getSupportedModels());
    if (this.openRouterService) models.push(...this.openRouterService.getSupportedModels());
    
    return models;
  }

  /**
   * Gets the default model to use when none is specified
   * @returns The default model name
   */
  public getDefaultModel(): string {
    // Prioritize OpenAI, then Claude, then Gemini, then OpenRouter
    if (process.env.OPENAI_API_KEY) {
      return 'gpt-4o-mini';
    } else if (process.env.ANTHROPIC_API_KEY) {
      return 'claude-3-5-sonnet-20241022';
    } else if (process.env.GEMINI_API_KEY) {
      return 'gemini-1.5-flash-8b';
    } else if (process.env.OPENROUTER_API_KEY) {
      return 'openai/gpt-4o-mini';
    }
    
    throw new Error('No API keys configured for any provider');
  }
}