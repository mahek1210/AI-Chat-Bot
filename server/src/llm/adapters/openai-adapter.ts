import OpenAI from 'openai';
import { LLMAdapter, LLMRequest, LLMResponse, LLMAdapterConfig } from '../types';

export class OpenAIAdapter implements LLMAdapter {
  private client: OpenAI;
  private defaultModel: string;

  constructor(config: LLMAdapterConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
    this.defaultModel = config.defaultModel || 'gpt-4o';
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const model = request.model || this.defaultModel;
    
    // Convert LLMMessage to OpenAI's expected format
    const messages = request.messages.map(msg => {
      if (msg.role === 'tool') {
        return {
          role: 'tool' as const,
          content: msg.content,
          tool_call_id: msg.tool_call_id!,
        };
      }
      return {
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      };
    });
    
    const response = await this.client.chat.completions.create({
      model,
      messages,
      temperature: request.temperature || 0.7,
      max_tokens: request.maxTokens,
      tools: request.tools,
      stream: false,
    });

    const message = response.choices[0]?.message;
    const content = message?.content || '';
    const usage = response.usage || {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    };

    const toolCalls = message?.tool_calls?.map(toolCall => ({
      id: toolCall.id,
      type: toolCall.type as 'function',
      function: {
        name: toolCall.function.name,
        arguments: toolCall.function.arguments,
      },
    }));

    return {
      content,
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      },
      toolCalls,
    };
  }

  supportsModel(model: string): boolean {
    // OpenAI supports various models - this is a basic check
    const supportedModels = [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k',
    ];
    return supportedModels.includes(model);
  }

  getDefaultModel(): string {
    return this.defaultModel;
  }
}
