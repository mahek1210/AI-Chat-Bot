export interface LLMRequest {
  messages: LLMMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: LLMTool[];
}

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_call_id?: string;
}

export interface LLMTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface LLMResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    costUSD?: number;
    latencyMs?: number;
  };
  toolCalls?: LLMToolCall[];
}

export interface LLMToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface LLMAdapter {
  generate(request: LLMRequest): Promise<LLMResponse>;
  supportsModel(model: string): boolean;
  getDefaultModel(): string;
}

export interface LLMAdapterConfig {
  apiKey: string;
  baseURL?: string;
  defaultModel?: string;
}
