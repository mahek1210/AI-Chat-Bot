import OpenAI from 'openai';
import { LLMRequest, LLMResponse, LLMToolCall } from '../llm/types';

export class OpenRouterService {
  private client: OpenAI;
  
  constructor() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is required for OpenRouter service');
    }
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': process.env.OPENROUTER_REFERER || 'http://localhost:3000',
        'X-Title': 'AI Chat Boat',
      },
    });
  }
  
  /**
   * Generate a response using OpenRouter models, with tool call support
   */
  public async generate(request: LLMRequest): Promise<LLMResponse> {
    try {
      console.log(`🤖 OpenRouter Service: Generating with model ${request.model}`);
      
      let modelName = request.model || 'openai/gpt-4o';
      if (modelName.startsWith('openrouter:')) {
        modelName = modelName.substring(11);
      }
      
      const originalModelName = modelName;
      let modelsToTry = [originalModelName];

      // Automatic fallback for free OpenRouter models
      if (originalModelName.endsWith(':free') || originalModelName === 'openrouter/free') {
        const freeFallbacks = [
          originalModelName,     // Attempt primary first
          'minimax/minimax-m2.5:free', // Extremely reliable fast free model
          'nvidia/nemotron-3-super-120b-a12b:free', // Very capable fallback
          'openai/gpt-oss-20b:free', // Last resort
          'openrouter/free'      // Auto router
        ];
        modelsToTry = Array.from(new Set(freeFallbacks));
      }
      
      let response;
      let actualModelUsed = originalModelName;
      let lastError: any;

      for (const currentModel of modelsToTry) {
        const createParams: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
          model: currentModel,
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
          createParams.tool_choice = 'auto'; // Will be cleaned later
        }

        try {
          console.log(`[OpenRouter] Attempting to generate text with ${currentModel}...`);
          response = await this.client.chat.completions.create(createParams, requestOptions);
          actualModelUsed = currentModel;
          break; // Success!
        } catch (error: any) {
          if ((error?.status === 404 || error?.status === 400) && createParams.tools) {
            console.warn(`[OpenRouter] Model ${currentModel} returned ${error.status} with tools. Retrying without tools...`);
            delete createParams.tools;
            delete createParams.tool_choice;
            
            try {
              response = await this.client.chat.completions.create(createParams, requestOptions);
              actualModelUsed = currentModel;
              break; // Success without tools!
            } catch (retryError: any) {
               lastError = retryError;
               console.warn(`[OpenRouter] Model ${currentModel} failed without tools (Status: ${retryError?.status}). Moving to next...`);
            }
          } else {
            lastError = error;
            console.warn(`[OpenRouter] Model ${currentModel} failed (Status: ${error?.status}). Moving to next fallback...`);
          }
        }
      }

      if (!response) {
        throw lastError || new Error('All OpenRouter fallback models failed.');
      }

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
      
      let fallbackInfo: any = undefined;
      if (actualModelUsed !== originalModelName) {
        fallbackInfo = {
          fallbackUsed: true,
          originalProvider: 'openrouter',
          fallbackReason: 'OpenRouter auto-fallback (Primary free model overloaded/unavailable)',
          originalModel: request.model,
          model: `openrouter:${actualModelUsed}`
        };
      }
      
      return {
        content: message.content || '',
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        toolCalls,
        provider: 'openrouter',
        fallbackInfo,
      };
    } catch (error) {
      console.error('OpenRouter Service Error:', error);
      throw new Error(`OpenRouter service error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  public getSupportedModels(): string[] {
    return [
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'openai/gpt-4-turbo',
      'anthropic/claude-3-opus',
      'anthropic/claude-3-sonnet',
      'anthropic/claude-3-haiku',
      'anthropic/claude-3.5-sonnet',
      'meta-llama/llama-3-70b-instruct',
      'meta-llama/llama-3-8b-instruct',
      'openrouter:llama-3-70b',
      'openrouter:claude-3.5-sonnet',
      'openrouter:nvidia/nemotron-3-super-120b-a12b:free',
      'openrouter:qwen/qwen3-next-80b-a3b-instruct:free',
      'openrouter:google/gemma-3n-e2b-it:free',
      'openrouter:nousresearch/hermes-3-llama-3.1-405b:free',
      'openrouter:arcee-ai/maestro-reasoning',
      'openrouter:mistralai/mistral-small-3.1-24b-instruct:free',
      'openrouter:arcee-ai/trinity-large-preview:free',
      'openrouter/auto',
      'openrouter:cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
    ];
  }
}
