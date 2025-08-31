import { LLMAdapter, LLMRequest, LLMResponse, LLMAdapterConfig } from '../types';

export class OpenRouterAdapter implements LLMAdapter {
  private apiKey: string;
  private baseURL: string;
  private defaultModel: string;

  constructor(config: LLMAdapterConfig) {
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || 'https://openrouter.ai/api/v1';
    this.defaultModel = config.defaultModel || 'openai/gpt-4o';
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const model = request.model || this.defaultModel;
    const mappedModel = this.mapModelName(model);
    
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://your-app.com', // Replace with your app URL
        'X-Title': 'AI Chat Boat', // Replace with your app name
      },
      body: JSON.stringify({
        model: mappedModel,
        messages: request.messages,
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens,
        tools: request.tools,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    const message = data.choices[0]?.message;
    const content = message?.content || '';
    const usage = data.usage || {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    };

    const toolCalls = message?.tool_calls?.map((toolCall: any) => ({
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
    // OpenRouter supports many models from different providers
    // This is a basic check - you might want to make this more comprehensive
    const supportedModels = [
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'openai/gpt-4-turbo',
      'openai/gpt-4',
      'openai/gpt-3.5-turbo',
      'anthropic/claude-3-opus',
      'anthropic/claude-3-sonnet',
      'anthropic/claude-3-haiku',
      'anthropic/claude-3.5-sonnet',
      'google/gemini-pro',
      'meta-llama/llama-3.1-70b-instruct',
      'meta-llama/llama-3.1-8b-instruct',
      'openrouter:claude-3.5-sonnet',
      'openrouter:llama-3.1-70b',
    ];
    return supportedModels.includes(model);
  }

  getDefaultModel(): string {
    return this.defaultModel;
  }

  private mapModelName(model: string): string {
    // Map frontend model names to OpenRouter model names
    const modelMap: Record<string, string> = {
      'openrouter:claude-3.5-sonnet': 'anthropic/claude-3.5-sonnet',
      'openrouter:llama-3.1-70b': 'meta-llama/llama-3.1-70b-instruct',
    };
    
    return modelMap[model] || model;
  }
}
