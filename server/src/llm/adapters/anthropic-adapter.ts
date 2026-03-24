import { LLMAdapter, LLMRequest, LLMResponse, LLMAdapterConfig } from '../types';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicRequest {
  model: string;
  max_tokens: number;
  messages: AnthropicMessage[];
  temperature?: number;
}

interface AnthropicResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class AnthropicAdapter implements LLMAdapter {
  private apiKey: string;
  private baseURL: string;
  private defaultModel: string;

  constructor(config: LLMAdapterConfig) {
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || 'https://api.anthropic.com';
    this.defaultModel = config.defaultModel || 'claude-3-5-sonnet-20241022';
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const model = request.model || this.defaultModel;
    
    // Convert LLMMessage to Anthropic's expected format
    // Filter out system messages and convert to Anthropic format
    const messages: AnthropicMessage[] = request.messages
      .filter(msg => msg.role !== 'system' && msg.role !== 'tool')
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));

    // If there's a system message, prepend it to the first user message
    const systemMessage = request.messages.find(msg => msg.role === 'system');
    if (systemMessage && messages.length > 0 && messages[0].role === 'user') {
      messages[0].content = `${systemMessage.content}\n\n${messages[0].content}`;
    }

    const anthropicRequest: AnthropicRequest = {
      model,
      max_tokens: request.maxTokens || 512,
      messages,
      temperature: request.temperature || 0.7,
    };

    const response = await fetch(`${this.baseURL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(anthropicRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
    }

    const data: AnthropicResponse = await response.json();
    
    if (!data.content || data.content.length === 0) {
      throw new Error('No response generated from Anthropic');
    }

    const content = data.content[0]?.text || '';
    const usage = data.usage || {
      input_tokens: 0,
      output_tokens: 0,
    };

    return {
      content,
      usage: {
        promptTokens: usage.input_tokens,
        completionTokens: usage.output_tokens,
        totalTokens: usage.input_tokens + usage.output_tokens,
      },
      // Note: Anthropic doesn't support function calling in the same way as OpenAI
      toolCalls: undefined,
    };
  }

  supportsModel(model: string): boolean {
    const supportedModels = [
      'claude-3-5-sonnet-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ];
    return supportedModels.includes(model);
  }

  getDefaultModel(): string {
    return this.defaultModel;
  }
}
