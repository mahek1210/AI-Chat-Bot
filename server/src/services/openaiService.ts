import OpenAI from 'openai';
import { LLMRequest, LLMResponse } from '../llm/types';

export class OpenAIService {
  private client: OpenAI;
  
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required for OpenAI service');
    }
    
    this.client = new OpenAI({ apiKey });
  }
  
  /**
   * Generate a response using OpenAI models
   * @param request The LLM request
   * @returns A promise resolving to the LLM response
   */
  public async generate(request: LLMRequest): Promise<LLMResponse> {
    try {
      console.log(`🤖 OpenAI Service: Generating with model ${request.model}`);
      
      const response = await this.client.chat.completions.create({
        model: request.model || 'gpt-4o',
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
        provider: 'openai',
      };
    } catch (error) {
      console.error('OpenAI Service Error:', error);
      throw new Error(`OpenAI service error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Get a list of supported OpenAI models
   * @returns Array of supported model names
   */
  public getSupportedModels(): string[] {
    return [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
    ];
  }
}