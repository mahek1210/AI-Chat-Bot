import { LLMAdapter, LLMRequest, LLMResponse, LLMAdapterConfig } from '../types';

interface GeminiContent {
  parts: Array<{
    text: string;
  }>;
}

interface GeminiRequest {
  contents: GeminiContent[];
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
  };
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export class GeminiAdapter implements LLMAdapter {
  private apiKey: string;
  private baseURL: string;
  private defaultModel: string;

  constructor(config: LLMAdapterConfig) {
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || 'https://generativelanguage.googleapis.com/v1beta';
    this.defaultModel = config.defaultModel || 'gemini-1.5-flash';
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const model = request.model || this.defaultModel;
    
    // Convert LLMMessage to Gemini's expected format
    // Gemini expects a single content array with all messages
    const allText = request.messages.map(msg => {
      if (msg.role === 'system') {
        return `System: ${msg.content}`;
      } else if (msg.role === 'user') {
        return `User: ${msg.content}`;
      } else if (msg.role === 'assistant') {
        return `Assistant: ${msg.content}`;
      } else {
        return msg.content;
      }
    }).join('\n\n');

    const geminiRequest: GeminiRequest = {
      contents: [{
        parts: [{ text: allText }]
      }],
      generationConfig: {
        temperature: request.temperature || 0.7,
        maxOutputTokens: request.maxTokens,
      },
    };

    const url = `${this.baseURL}/models/${model}:generateContent?key=${this.apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(geminiRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data: GeminiResponse = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response generated from Gemini');
    }

    const content = data.candidates[0].content.parts[0]?.text || '';
    const usage = data.usageMetadata || {
      promptTokenCount: 0,
      candidatesTokenCount: 0,
      totalTokenCount: 0,
    };

    return {
      content,
      usage: {
        promptTokens: usage.promptTokenCount,
        completionTokens: usage.candidatesTokenCount,
        totalTokens: usage.totalTokenCount,
      },
      // Note: Gemini doesn't support function calling in the same way as OpenAI
      // This would need to be implemented differently if needed
      toolCalls: undefined,
    };
  }

  supportsModel(model: string): boolean {
    const supportedModels = [
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-1.0-pro',
      'gemini-1.0-pro-vision',
    ];
    return supportedModels.includes(model);
  }

  getDefaultModel(): string {
    return this.defaultModel;
  }
}
