import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMRequest, LLMResponse } from '../llm/types';

// ==========================================
// 1. STATE MANAGEMENT & RATE LIMITER
// ==========================================
const MAX_REQUESTS_PER_MINUTE = 25;
const requestTimestamps: number[] = [];
let requestQueue: Array<{
  request: LLMRequest;
  resolve: (res: LLMResponse) => void;
  reject: (err: any) => void;
  retryCount: number;
  currentModelIndex: number;
}> = [];

let isProcessingQueue = false;

// EXACT USER REQUESTED FALLBACK CHAIN (2.0 and 2.5 ONLY)
const FALLBACK_CHAIN = [
  'gemini-2.5-flash',         // DEFAULT, always try first
  'gemini-2.0-flash',         // Fallback #1
  'gemini-2.0-pro'            // Fallback #2
];

// Track suspended models (429 rate limited) for exactly 60 seconds
const suspendedModels = new Map<string, number>();

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class GeminiService {
  private client: GoogleGenerativeAI;
  
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("❌ CRITICAL ERROR: GEMINI_API_KEY is missing or invalid in .env");
      throw new Error('GEMINI_API_KEY is required for Gemini service');
    }
    this.client = new GoogleGenerativeAI(apiKey);
    this.runStartupValidation();
  }

  // ==========================================
  // STARTUP VALIDATION PING
  // ==========================================
  private async runStartupValidation() {
    console.log("🔄 Starting local ping test for Gemini default model...");
    const defaultModel = FALLBACK_CHAIN[0];
    try {
      const model = this.client.getGenerativeModel({ model: defaultModel });
      await model.generateContent("Ping. Reply with exactly 'Pong'.");
      console.log(`✅ Default model confirmed active: ${defaultModel}`);
    } catch (error: any) {
      console.error(`❌ Default model unavailable: ${defaultModel}`, error.message);
    }
  }

  // ==========================================
  // QUEUE PROCESSING ENGINE
  // ==========================================
  private async processQueue() {
    if (isProcessingQueue) return;
    isProcessingQueue = true;

    while (requestQueue.length > 0) {
      const now = Date.now();

      // Clean up old timestamps (older than 60 seconds)
      while (requestTimestamps.length > 0 && now - requestTimestamps[0] > 60000) {
        requestTimestamps.shift();
      }

      // Max requests per minute (25 RPM)
      if (requestTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
        const timeToWait = 60000 - (Date.now() - requestTimestamps[0]);
        console.log(`⏳ Queue full. Waiting ${Math.round(timeToWait / 1000)}s to stay under limit...`);
        await delay(timeToWait + 50);
        continue;
      }

      const currentJob = requestQueue.shift()!;
      const { request, resolve, reject, currentModelIndex } = currentJob;
      const modelNameToTry = FALLBACK_CHAIN[currentModelIndex];

      // Reset rule check: After 60 seconds -> start from gemini-2.5-flash again
      if (suspendedModels.has(modelNameToTry)) {
        const suspendedTime = suspendedModels.get(modelNameToTry)!;
        if (Date.now() - suspendedTime < 60000) {
           // Skip model while in the 60s timeout window
           if (currentModelIndex + 1 < FALLBACK_CHAIN.length) {
              const nextModel = FALLBACK_CHAIN[currentModelIndex + 1];
              console.log(`Switching from ${modelNameToTry} to ${nextModel} because: Currently in 60s timeout block`);
              requestQueue.unshift({
                 ...currentJob,
                 currentModelIndex: currentModelIndex + 1
              });
           } else {
              // ALL models are currently active in their 60s timeouts
              resolve(this.createFriendlyErrorResponse("AI is busy, try again in a moment"));
           }
           continue;
        } else {
           // 60 seconds passed, reset and unlock model
           console.log(`✅ 60s suspension over. Unlocking model: ${modelNameToTry}`);
           suspendedModels.delete(modelNameToTry);
        }
      }

      try {
        console.log(`🤖 Gemini Service: Generating with model ${modelNameToTry}`);
        requestTimestamps.push(Date.now());
        
        const model = this.client.getGenerativeModel({ 
          model: modelNameToTry,
          generationConfig: {
            temperature: request.temperature ?? 0.7,
            maxOutputTokens: request.maxTokens,
          }
        });
        
        // Formatting chunks...
        let systemInstruction = '';
        const nonSystemMessages = request.messages.filter(msg => {
          if (msg.role === 'system') {
            systemInstruction = msg.content;
            return false;
          }
          return true;
        });

        const formattedMessages: { role: string; parts: { text: string }[] }[] = [];
        for (const msg of nonSystemMessages) {
          if (msg.role === 'tool') {
            formattedMessages.push({
              role: 'user',
              parts: [{ text: `[Search result]: ${msg.content}` }],
            });
          } else {
            formattedMessages.push({
              role: msg.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: msg.content }],
            });
          }
        }

        if (systemInstruction && formattedMessages.length > 0 && formattedMessages[0].role === 'user') {
          formattedMessages[0].parts[0].text = `${systemInstruction}\n\nUser: ${formattedMessages[0].parts[0].text}`;
        }

        const mergedMessages: typeof formattedMessages = [];
        for (const msg of formattedMessages) {
           const lastMsg = mergedMessages[mergedMessages.length - 1];
           if (lastMsg && lastMsg.role === msg.role) {
              lastMsg.parts[0].text += "\n\n" + msg.parts[0].text;
           } else {
              mergedMessages.push(msg);
           }
        }

        if (mergedMessages.length === 0 || mergedMessages[mergedMessages.length - 1].role !== 'user') {
          mergedMessages.push({ role: 'user', parts: [{ text: 'Please continue.' }] });
        }

        if (request.abortSignal?.aborted) {
           throw new Error('AbortError: The user aborted a request.');
        }

        const requestOptions = request.abortSignal ? { signal: request.abortSignal } : undefined;
        const result = await model.generateContent({ contents: mergedMessages }, requestOptions);
        const text = result.response.text() || '';
        
        console.log(`✅ Successfully generated response using defined model: ${modelNameToTry}`);
        
        resolve({
          content: text,
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          provider: 'gemini',
        });

      } catch (error: any) {
        const errorMsg = error.message || 'Unknown error';
        const isRateLimit = error.status === 429 || errorMsg.includes("429") || errorMsg.includes("Quota exceeded");
        const isUnsupported = error.status === 404 || errorMsg.includes("not found") || errorMsg.includes("unsupported");
        const isApiKeyError = error.status === 400 && errorMsg.includes("API key");

        if (isApiKeyError) {
          console.error(`❌ API key is invalid or revoked.\n`, errorMsg);
          resolve(this.createFriendlyErrorResponse("The AI API key is currently invalid or revoked. Please try again later."));
          continue;
        }

        if (isUnsupported) {
          if (currentModelIndex + 1 < FALLBACK_CHAIN.length) {
            const nextModel = FALLBACK_CHAIN[currentModelIndex + 1];
            console.log(`Switching from ${modelNameToTry} to ${nextModel} because: Model unsupported`);
            requestQueue.unshift({
               ...currentJob,
               currentModelIndex: currentModelIndex + 1
            });
          } else {
             // Failed out of entire chain
             resolve(this.createFriendlyErrorResponse("AI is busy, try again in a moment"));
          }
          continue;
        }
        
        if (isRateLimit) {
          // Suspend specifically for 60 seconds
          suspendedModels.set(modelNameToTry, Date.now());

          if (currentModelIndex + 1 < FALLBACK_CHAIN.length) {
             const nextModel = FALLBACK_CHAIN[currentModelIndex + 1];
             console.log(`Switching from ${modelNameToTry} to ${nextModel} because: Exceeded rate limit / 429`);
             requestQueue.unshift({
                ...currentJob,
                currentModelIndex: currentModelIndex + 1
             });
             // Immediately process next iteration without backoff
             continue;
          } else {
             console.error("❌ Exhausted complete 4-model fallback chain.");
             resolve(this.createFriendlyErrorResponse("AI is busy, try again in a moment"));
          }
        } else {
          // Unhandled
          console.error(`❌ Gemini API Error:`, errorMsg);
          resolve(this.createFriendlyErrorResponse("An unexpected AI error occurred generating the response. Please try again."));
        }
      }
    }

    isProcessingQueue = false;
  }

  private createFriendlyErrorResponse(text: string): LLMResponse {
     return {
         content: text,
         usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
         provider: 'gemini',
     }
  }

  // PUBLIC ENTRY POINT
  public async generate(request: LLMRequest): Promise<LLMResponse> {
    return new Promise((resolve, reject) => {
      const requestedIndex = request.model ? FALLBACK_CHAIN.indexOf(request.model) : -1;
      
      requestQueue.push({
        request,
        resolve,
        reject,
        retryCount: 0,
        currentModelIndex: requestedIndex >= 0 ? requestedIndex : 0 // Start at requested model, else default
      });
      
      this.processQueue();
    });
  }

  public getSupportedModels(): string[] {
    return FALLBACK_CHAIN;
  }
}
