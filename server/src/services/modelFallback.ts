import { LLMRequest, LLMResponse } from '../llm/types';

/**
 * Model fallback configuration for each provider
 */
export const MODEL_FALLBACKS = {
  gemini: {
    'gemini-2.5-flash': ['gemini-2.0-flash'],
    'gemini-2.0-flash': ['gemini-2.5-flash'],
    'google/gemini-2.5-flash': ['gemini-2.0-flash'],
    'google/gemini-2.0-flash': ['gemini-2.5-flash'],
  },
  openai: {
    'gpt-4o': ['gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    'gpt-4o-mini': ['gpt-3.5-turbo', 'gpt-4-turbo'],
    'gpt-4-turbo': ['gpt-4', 'gpt-3.5-turbo'],
    'gpt-4': ['gpt-3.5-turbo'],
  },
  claude: {
    'claude-3-5-sonnet-20241022': ['claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
    'claude-3-opus-20240229': ['claude-3-5-sonnet-20241022', 'claude-3-sonnet-20240229'],
    'claude-3-sonnet-20240229': ['claude-3-haiku-20240307'],
  },
  openrouter: {
    'meta-llama/llama-3-8b-instruct': ['meta-llama/llama-3-70b-instruct'],
    'openrouter:claude-3.5-sonnet': ['anthropic/claude-3.5-sonnet'],
  }
};

/**
 * OpenRouter equivalents for OpenAI models (for quota fallback)
 */
export const OPENAI_TO_OPENROUTER: Record<string, string> = {
  'gpt-4o': 'openai/gpt-4o',
  'gpt-4o-mini': 'openai/gpt-4o-mini',
  'gpt-4-turbo': 'openai/gpt-4-turbo',
  'gpt-4': 'openai/gpt-4',
  'gpt-3.5-turbo': 'openai/gpt-3.5-turbo',
};

export interface FallbackResult {
  success: boolean;
  model?: string;
  provider?: string;
  error?: string;
  suggestions?: string[];
}

export class ModelFallbackHandler {
  /**
   * Get fallback models for a given model
   */
  static getFallbackModels(model: string, provider: string): string[] {
    const providerFallbacks = MODEL_FALLBACKS[provider as keyof typeof MODEL_FALLBACKS];
    if (providerFallbacks && model in providerFallbacks) {
      return providerFallbacks[model as keyof typeof providerFallbacks];
    }
    return [];
  }

  /**
   * Check if error is a quota/billing issue for OpenAI
   */
  static isQuotaError(error: any): boolean {
    const errorMsg = error?.message || error?.toString() || '';
    return errorMsg.includes('429') || 
           errorMsg.includes('quota') || 
           errorMsg.includes('insufficient_quota') ||
           errorMsg.includes('billing');
  }

  /**
   * Check if error is a model not found issue
   */
  static isModelNotFoundError(error: any): boolean {
    const errorMsg = error?.message || error?.toString() || '';
    return errorMsg.includes('404') || 
           errorMsg.includes('not found') || 
           errorMsg.includes('not supported') ||
           errorMsg.includes('is not found for API version');
  }

  /**
   * Get OpenRouter equivalent for OpenAI model
   */
  static getOpenRouterEquivalent(openaiModel: string): string | null {
    return OPENAI_TO_OPENROUTER[openaiModel] || null;
  }

  /**
   * Suggest alternative models based on error
   */
  static suggestAlternatives(model: string, provider: string, error: any): string[] {
    const suggestions: string[] = [];

    // Get fallback models for the same provider
    const providerFallbacks = this.getFallbackModels(model, provider);
    suggestions.push(...providerFallbacks);

    // If OpenAI quota issue, suggest OpenRouter
    if (provider === 'openai' && this.isQuotaError(error)) {
      const openRouterEquiv = this.getOpenRouterEquivalent(model);
      if (openRouterEquiv) {
        suggestions.push(openRouterEquiv);
      }
    }

    // If model not found, suggest popular alternatives
    if (this.isModelNotFoundError(error)) {
      if (provider === 'gemini') {
        suggestions.push('gemini-2.0-flash');
      } else if (provider === 'openai') {
        suggestions.push('claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307');
      }
    }

    // Remove duplicates
    return [...new Set(suggestions)];
  }

  /**
   * Create error response with suggestions
   */
  static createErrorResponse(
    originalModel: string,
    provider: string,
    error: any
  ): { error: string; suggestions: string[] } {
    const suggestions = this.suggestAlternatives(originalModel, provider, error);
    
    return {
      error: `Model "${originalModel}" failed: ${error?.message || 'Unknown error'}`,
      suggestions: suggestions.length > 0 
        ? suggestions 
        : ['gpt-3.5-turbo', 'gemini-2.5-flash', 'claude-3-haiku-20240307'],
    };
  }
}
