import { LLMAdapter, LLMRequest, LLMResponse, LLMAdapterConfig } from '../types';

interface LlamaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface LlamaRequest {
  model: string;
  messages: LlamaMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface LlamaResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class LlamaAdapter implements LLMAdapter {
  private apiKey: string;
  private baseURL: string;
  private defaultModel: string;

  constructor(config: LLMAdapterConfig) {
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || 'https://openrouter.ai/api/v1';
    this.defaultModel = config.defaultModel || 'meta-llama/llama-3-8b-instruct';
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const model = request.model || this.defaultModel;
    
    // Convert LLMMessage to Llama's expected format
    const messages: LlamaMessage[] = request.messages
      .filter(msg => msg.role !== 'tool')
      .map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }));

    const llamaRequest: LlamaRequest = {
      model,
      messages,
      temperature: request.temperature || 0.7,
      max_tokens: request.maxTokens,
      stream: false,
    };

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://ai-chat-bot.com',
        'X-Title': 'AI Chat Bot',
      },
      body: JSON.stringify(llamaRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Llama API error: ${response.status} - ${errorText}`);
    }

    const data: LlamaResponse = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response generated from Llama');
    }

    const content = data.choices[0].message.content;
    const usage = data.usage || {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    };

    return {
      content,
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      },
      // Note: Llama doesn't support function calling in the same way as OpenAI
      toolCalls: undefined,
    };
  }

  supportsModel(model: string): boolean {
    const supportedModels = [
      'meta-llama/llama-3-8b-instruct',
      'meta-llama/llama-3-70b-instruct',
      'meta-llama/llama-3.1-8b-instruct',
      'meta-llama/llama-3.1-70b-instruct',
    ];
    return supportedModels.includes(model);
  }

  getDefaultModel(): string {
    return this.defaultModel;
  }
}
