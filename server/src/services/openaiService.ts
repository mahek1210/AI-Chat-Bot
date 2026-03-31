import OpenAI from 'openai';
import { LLMRequest, LLMResponse, LLMToolCall } from '../llm/types';

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
   * Generate a response using OpenAI models, with full tool call support
   */
  public async generate(request: LLMRequest): Promise<LLMResponse> {
    try {
      console.log(`🤖 OpenAI Service: Generating with model ${request.model}`);
      
      const createParams: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
        model: request.model || 'gpt-4o',
        messages: request.messages as OpenAI.Chat.ChatCompletionMessageParam[],
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens,
      };

      const requestOptions: OpenAI.RequestOptions = {
        signal: request.abortSignal,
      };

      if (request.tools && request.tools.length > 0) {
        createParams.tools = request.tools.map(t => ({
          type: 'function' as const,
          function: t.function,
        }));
        createParams.tool_choice = 'auto';
      }
      
      let finalContent = '';
      let promptTokens = 0;
      let completionTokens = 0;
      let toolCalls: LLMToolCall[] | undefined;

      // Always stream if onChunk is provided
      if (request.onChunk) {
        const streamOptions = { ...createParams, stream: true as const, stream_options: { include_usage: true } };
        const stream = await this.client.chat.completions.create(streamOptions, requestOptions);
        
        let rawToolCalls: any[] = [];
        
        for await (const chunk of stream) {
          if (chunk.choices && chunk.choices.length > 0) {
            const delta = chunk.choices[0].delta;
            
            // Handle text chunks
            if (delta.content) {
              finalContent += delta.content;
              request.onChunk(delta.content);
            }
            
            // Handle streaming tool calls
            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                const index = tc.index;
                if (!rawToolCalls[index]) {
                  rawToolCalls[index] = {
                    id: tc.id || '',
                    type: 'function',
                    function: { name: tc.function?.name || '', arguments: tc.function?.arguments || '' }
                  };
                } else {
                  if (tc.function?.arguments) {
                    rawToolCalls[index].function.arguments += tc.function.arguments;
                  }
                }
              }
            }
          }
          if (chunk.usage) {
            promptTokens = chunk.usage.prompt_tokens;
            completionTokens = chunk.usage.completion_tokens;
          }
        }
        
        if (rawToolCalls.length > 0) {
          toolCalls = rawToolCalls.filter(Boolean); // Clean any sparse indices
        }
        
      } else {
        const response = await this.client.chat.completions.create(createParams, requestOptions);
        const choice = response.choices[0];
        const message = choice.message;
        
        finalContent = message.content || '';
        promptTokens = response.usage?.prompt_tokens || 0;
        completionTokens = response.usage?.completion_tokens || 0;

        if (message.tool_calls && message.tool_calls.length > 0) {
          toolCalls = message.tool_calls.map(tc => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments,
            },
          }));
        }
      }
      
      return {
        content: finalContent,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
        toolCalls,
        provider: 'openai',
      };
    } catch (error) {
      console.error('OpenAI Service Error:', error);
      throw new Error(`OpenAI service error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  public getSupportedModels(): string[] {
    return ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'];
  }
}
