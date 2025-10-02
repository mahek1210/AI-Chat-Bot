import Anthropic from '@anthropic-ai/sdk';
import { LLMRequest, LLMResponse } from '../llm/types';

export class ClaudeService {
  private client: Anthropic;
  
  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }
    
    this.client = new Anthropic({
      apiKey,
      baseURL: process.env.ANTHROPIC_BASE_URL,
    });
  }
  
  /**
   * Generate a response using Anthropic Claude models
   * @param request The LLM request
   * @returns A promise resolving to the LLM response
   */
  public async generate(request: LLMRequest): Promise<LLMResponse> {
    return this.generateWithFallback(request, request.model || 'claude-3-5-sonnet-20241022');
  }

  private async generateWithFallback(request: LLMRequest, modelToTry: string, attemptCount: number = 0): Promise<LLMResponse> {
    try {
      console.log(`🤖 Claude Service: Generating with model ${modelToTry} (attempt ${attemptCount + 1})`);
      
      // Extract model name without prefix if needed
      const modelName = modelToTry.startsWith('anthropic/') 
        ? modelToTry.substring(10) 
        : modelToTry;
      
      // Convert messages to Claude format (exclude system messages)
      const messages = request.messages
        .filter(msg => msg.role !== 'system' && msg.role !== 'tool')
        .map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }));
      
      const response = await this.client.messages.create({
        model: modelName,
        messages,
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 1024,
      });
      
      const firstContent = response.content[0];
      const contentText = firstContent.type === 'text' ? firstContent.text : '';
      
      console.log(`✅ Claude Service: Successfully generated response with ${modelToTry}`);
      
      return {
        content: contentText,
        usage: {
          promptTokens: response.usage?.input_tokens || 0,
          completionTokens: response.usage?.output_tokens || 0,
          totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
        },
        provider: 'claude',
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Claude Service Error with ${modelToTry}:`, errorMsg);
      
      // Check if it's a model not found error
      if (errorMsg.includes('404') || errorMsg.includes('not found') || errorMsg.includes('model_not_found')) {
        // Try fallback models
        const fallbackModels = this.getFallbackModels(modelToTry);
        
        if (attemptCount < 3 && fallbackModels.length > attemptCount) {
          const nextModel = fallbackModels[attemptCount];
          console.log(`🔄 Claude: Trying fallback model ${nextModel}`);
          return this.generateWithFallback(request, nextModel, attemptCount + 1);
        }
      }
      
      throw new Error(`Claude service error: ${errorMsg}`);
    }
  }

  private getFallbackModels(originalModel: string): string[] {
    const fallbacks: Record<string, string[]> = {
      'claude-3-5-sonnet-20241022': ['claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
      'claude-3-opus-20240229': ['claude-3-5-sonnet-20241022', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
      'claude-3-sonnet-20240229': ['claude-3-haiku-20240307'],
      'anthropic/claude-3-5-sonnet': ['claude-3-5-sonnet-20241022', 'claude-3-sonnet-20240229'],
      'anthropic/claude-3-opus': ['claude-3-opus-20240229', 'claude-3-sonnet-20240229'],
    };
    
    return fallbacks[originalModel] || ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'];
  }
  
  /**
   * Get a list of supported Claude models
   * @returns Array of supported model names
   */
  public getSupportedModels(): string[] {
    return [
      'claude-3-5-sonnet-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'anthropic/claude-3-5-sonnet',
      'anthropic/claude-3-opus',
      'anthropic/claude-3-sonnet',
      'anthropic/claude-3-haiku',
    ];
  }
}