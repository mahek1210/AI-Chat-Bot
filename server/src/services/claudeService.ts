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
  
  public async generate(request: LLMRequest): Promise<LLMResponse> {
    return this.generateWithFallback(request, request.model || 'claude-3-5-sonnet-20241022');
  }

  private async generateWithFallback(request: LLMRequest, modelToTry: string, attemptCount: number = 0): Promise<LLMResponse> {
    try {
      console.log(`🤖 Claude Service: Generating with model ${modelToTry} (attempt ${attemptCount + 1})`);
      
      const modelName = modelToTry.startsWith('anthropic/')
        ? modelToTry.substring(10)
        : modelToTry;

      // Extract system prompt from messages
      const systemMessage = request.messages.find(m => m.role === 'system');
      const systemPrompt = systemMessage?.content;

      // Build conversation messages (excluding system and tool messages)
      // Tool result messages need special handling — merge them into prior user turns
      const conversationMessages: Anthropic.MessageParam[] = [];

      for (const msg of request.messages) {
        if (msg.role === 'system') continue; // handled via system param

        if (msg.role === 'tool') {
          // Append tool result as a user message (Claude doesn't have a 'tool' role)
          conversationMessages.push({
            role: 'user',
            content: `[Tool result for ${msg.tool_call_id}]: ${msg.content}`,
          });
        } else if (msg.role === 'assistant' || msg.role === 'user') {
          conversationMessages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }

      // Ensure the last message is from the user (Claude requires this)
      if (conversationMessages.length === 0 || conversationMessages[conversationMessages.length - 1].role !== 'user') {
        conversationMessages.push({ role: 'user', content: 'Please continue.' });
      }

      const createParams: Anthropic.MessageCreateParamsNonStreaming = {
        model: modelName,
        messages: conversationMessages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens || 1024,
      };

      const requestOptions: Anthropic.RequestOptions = {
        signal: request.abortSignal,
      };

      let contentText = '';
      let inputTokens = 0;
      let outputTokens = 0;

      if (systemPrompt) {
        createParams.system = systemPrompt;
      }

      if (request.onChunk) {
        const streamOptions: Anthropic.MessageCreateParamsStreaming = {
          ...createParams,
          stream: true,
        };
        const stream = await this.client.messages.create(streamOptions, requestOptions);
        
        for await (const messageStreamEvent of stream) {
          if (messageStreamEvent.type === 'message_start') {
             inputTokens = messageStreamEvent.message.usage.input_tokens;
          } else if (messageStreamEvent.type === 'content_block_delta' && messageStreamEvent.delta.type === 'text_delta') {
             contentText += messageStreamEvent.delta.text;
             request.onChunk(messageStreamEvent.delta.text);
          } else if (messageStreamEvent.type === 'message_delta') {
             outputTokens = messageStreamEvent.usage.output_tokens;
          }
        }
      } else {
        const response = await this.client.messages.create(createParams, requestOptions);
        const firstContent = response.content[0];
        contentText = firstContent.type === 'text' ? firstContent.text : '';
        inputTokens = response.usage?.input_tokens || 0;
        outputTokens = response.usage?.output_tokens || 0;
      }
      
      console.log(`✅ Claude Service: Successfully generated response with ${modelToTry}`);
      
      return {
        content: contentText,
        usage: {
          promptTokens: inputTokens,
          completionTokens: outputTokens,
          totalTokens: inputTokens + outputTokens,
        },
        provider: 'claude',
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Claude Service Error with ${modelToTry}:`, errorMsg);
      
      if (errorMsg.includes('404') || errorMsg.includes('not found') || errorMsg.includes('model_not_found')) {
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
