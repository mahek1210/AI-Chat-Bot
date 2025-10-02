import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMRequest, LLMResponse } from '../llm/types';

export class GeminiService {
  private client: GoogleGenerativeAI;
  
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required for Gemini service');
    }
    
    this.client = new GoogleGenerativeAI(apiKey);
  }
  
  /**
   * Generate a response using Google Gemini models
   * @param request The LLM request
   * @returns A promise resolving to the LLM response
   */
  public async generate(request: LLMRequest): Promise<LLMResponse> {
    return this.generateWithFallback(request, request.model || 'gemini-1.5-flash');
  }

  private async generateWithFallback(request: LLMRequest, modelToTry: string, attemptCount: number = 0): Promise<LLMResponse> {
    try {
      console.log(`🤖 Gemini Service: Generating with model ${modelToTry} (attempt ${attemptCount + 1})`);
      
      // Extract model name without prefix if needed
      const modelName = modelToTry.startsWith('google/') 
        ? modelToTry.substring(7) 
        : modelToTry;
      
      const model = this.client.getGenerativeModel({ 
        model: modelName,
        generationConfig: {
          temperature: request.temperature || 0.7,
          maxOutputTokens: request.maxTokens,
        }
      });
      
      // Convert messages to Gemini format
      // Gemini doesn't support system messages directly, so we need to handle them differently
      let systemInstruction = '';
      const formattedMessages = request.messages
        .filter(msg => {
          if (msg.role === 'system') {
            systemInstruction = msg.content;
            return false;
          }
          return true;
        })
        .map(msg => ({
          role: msg.role === 'assistant' ? 'model' : msg.role,
          parts: [{ text: msg.content }]
        }));
      
      // If there's a system message, prepend it to the first user message
      if (systemInstruction && formattedMessages.length > 0 && formattedMessages[0].role === 'user') {
        formattedMessages[0].parts[0].text = `${systemInstruction}\n\nUser: ${formattedMessages[0].parts[0].text}`;
      }
      
      const result = await model.generateContent({
        contents: formattedMessages,
      });
      
      const response = result.response;
      const text = response.text();
      
      // Gemini doesn't provide token counts in the same way
      // We'll estimate based on text length
      const estimatedTokens = Math.ceil(text.length / 4);
      
      console.log(`✅ Gemini Service: Successfully generated response with ${modelToTry}`);
      
      return {
        content: text,
        usage: {
          promptTokens: Math.ceil(JSON.stringify(request.messages).length / 4),
          completionTokens: estimatedTokens,
          totalTokens: Math.ceil(JSON.stringify(request.messages).length / 4) + estimatedTokens,
        },
        provider: 'gemini',
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Gemini Service Error with ${modelToTry}:`, errorMsg);
      
      // Check if it's a 404 or model not found error
      if (errorMsg.includes('404') || errorMsg.includes('not found') || errorMsg.includes('is not found for API version')) {
        // Try fallback models
        const fallbackModels = this.getFallbackModels(modelToTry);
        
        if (attemptCount < 3 && fallbackModels.length > attemptCount) {
          const nextModel = fallbackModels[attemptCount];
          console.log(`🔄 Gemini: Trying fallback model ${nextModel}`);
          return this.generateWithFallback(request, nextModel, attemptCount + 1);
        }
      }
      
      throw new Error(`Gemini service error: ${errorMsg}`);
    }
  }

  private getFallbackModels(originalModel: string): string[] {
    const fallbacks: Record<string, string[]> = {
      'gemini-1.5-flash': ['gemini-1.5-flash-8b'],
      'gemini-1.5-pro': ['gemini-1.5-flash', 'gemini-1.5-flash-8b'],
      'gemini-pro': ['gemini-1.5-flash', 'gemini-1.5-flash-8b'],
      'google/gemini-1.5-flash': ['gemini-1.5-flash-8b'],
      'google/gemini-1.5-pro': ['gemini-1.5-flash', 'gemini-1.5-flash-8b'],
    };
    
    return fallbacks[originalModel] || ['gemini-1.5-flash-8b'];
  }
  
  /**
   * Get a list of supported Gemini models
   * @returns Array of supported model names
   */
  public getSupportedModels(): string[] {
    // Temporarily disable Gemini models until API issues are resolved
    return [];
    // return [
    //   'gemini-1.5-flash-8b',
    //   'gemini-1.5-flash',
    //   'gemini-1.5-pro',
    //   'google/gemini-1.5-flash-8b',
    //   'google/gemini-1.5-flash',
    //   'google/gemini-1.5-pro',
    // ];
  }
}