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
      
      const response = await this.client.chat.completions.create(createParams, requestOptions);
      const choice = response.choices[0];
      const message = choice.message;

      let toolCalls: LLMToolCall[] | undefined;
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
      
      return {
        content: message.content || '',
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
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
