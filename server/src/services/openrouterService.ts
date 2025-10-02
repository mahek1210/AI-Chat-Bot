import OpenAI from 'openai';
import { LLMRequest, LLMResponse } from '../llm/types';

export class OpenRouterService {
  private client: OpenAI;
  
  constructor() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is required for OpenRouter service');
    }
    
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': process.env.OPENROUTER_REFERER || 'http://localhost:3000',
        'X-Title': 'AI Chat Boat',
      },
    });
  }
  
  /**
   * Generate a response using OpenRouter models
   * @param request The LLM request
   * @returns A promise resolving to the LLM response
   */
  public async generate(request: LLMRequest): Promise<LLMResponse> {
    try {
      console.log(`🤖 OpenRouter Service: Generating with model ${request.model}`);
      
      // Handle model name format
      let modelName = request.model || 'openai/gpt-4o';
      
      // If it starts with openrouter:, remove the prefix
      if (modelName.startsWith('openrouter:')) {
        modelName = modelName.substring(11);
      }
      
      const response = await this.client.chat.completions.create({
        model: modelName,
        messages: request.messages as any,
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens,
      });
      
      return {
        content: response.choices[0].message.content || '',
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        provider: 'openrouter',
      };
    } catch (error) {
      console.error('OpenRouter Service Error:', error);
      throw new Error(`OpenRouter service error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Get a list of supported OpenRouter models
   * @returns Array of supported model names
   */
  public getSupportedModels(): string[] {
    return [
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'openai/gpt-4-turbo',
      'anthropic/claude-3-opus',
      'anthropic/claude-3-sonnet',
      'anthropic/claude-3-haiku',
      'anthropic/claude-3.5-sonnet',
      'meta-llama/llama-3-70b-instruct',
      'meta-llama/llama-3-8b-instruct',
      'openrouter:llama-3-70b',
      'openrouter:claude-3.5-sonnet',
    ];
  }
}