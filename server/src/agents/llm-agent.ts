import type { Channel, DefaultGenerics, Event, StreamChat } from "stream-chat";
import type { AIAgent } from "./types";
import { LLMRequest, LLMMessage, LLMResponse } from "../llm/types";
import { estimateCostUSD } from "../llm/pricing";
import { recordRequest } from "../metrics";
import { AIRouter } from "../services/aiRouter";
import { getRandomAbortQuote } from "../utils/funny-quotes";
import { getProfileById, BUILT_IN_PROFILES } from "../utils/ai-profiles";
import { MemoryClient } from "mem0ai";

const mem0 = process.env.MEM0_API_KEY ? new MemoryClient({ apiKey: process.env.MEM0_API_KEY }) : null;

export class LLMAgent implements AIAgent {
  private aiRouter: AIRouter;
  private lastInteractionTs = Date.now();
  private defaultModel: string;
  private provider: string;
  private profileId: string;
  private customProfilePrompt: string | undefined;

  constructor(
    readonly chatClient: StreamChat,
    readonly channel: Channel,
    model?: string,
    profileId?: string,
    customProfilePrompt?: string
  ) {
    this.aiRouter = new AIRouter();
    this.defaultModel = model || this.aiRouter.getDefaultModel();
    // Store the provider based on the model for future messages
    this.provider = model ? this.aiRouter.detectProvider(model) : 'openai';
    this.profileId = profileId || 'writing_coach';
    this.customProfilePrompt = customProfilePrompt;
  }

  /**
   * Update the agent's default model dynamically
   * @param model The new model to use
   */
  updateModel = (model: string) => {
    console.log(`🔄 LLM Agent updating model from ${this.defaultModel} to ${model}`);
    this.defaultModel = model;
    this.provider = this.aiRouter.detectProvider(model);
  };

  /**
   * Get the current model being used by the agent
   * @returns The current default model
   */
  getCurrentModel = (): string => {
    return this.defaultModel;
  };

  dispose = async () => {
    this.chatClient.off("message.new", this.handleMessage);
    await this.chatClient.disconnectUser();
  };

  get user() {
    return this.chatClient.user;
  }

  getLastInteraction = (): number => this.lastInteractionTs;

  init = async () => {
    this.chatClient.on("message.new", this.handleMessage);
  };

  private getSystemPrompt = (context?: string): string => {
    const lengthConstraint = "\n\nCRITICAL RULE: Never exceed 800 words in a single response under any circumstances. If the user's request requires more detail, truncate your response naturally and ask the user if they would like you to continue.";

    // Use custom profile prompt if provided
    if (this.customProfilePrompt) {
      return this.customProfilePrompt + lengthConstraint;
    }
    
    // Look up profile by ID
    const profile = getProfileById(this.profileId);
    if (profile) {
      // Inject current date into all profiles
      const currentDate = new Date().toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
      });
      const basePrompt = profile.systemPrompt.replace('{{date}}', currentDate);
      let finalPrompt = basePrompt;
      if (context) finalPrompt = `${finalPrompt}\n\n**Additional Context**: ${context}`;
      return finalPrompt + lengthConstraint;
    }
    
    // Fallback to default writing prompt
    return this.getWritingAssistantPrompt(context) + lengthConstraint;
  };

  private getWritingAssistantPrompt = (context?: string): string => {
    const currentDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return `You are an expert AI Writing Assistant. Your primary purpose is to be a collaborative writing partner.

**Your Core Capabilities:**
- Content Creation, Improvement, Style Adaptation, Brainstorming, and Writing Coaching.
- **Web Search**: You have the ability to search the web for up-to-date information using the 'web_search' tool.
- **Current Date**: Today's date is ${currentDate}. Please use this for any time-sensitive queries.

**Crucial Instructions:**
1.  **ALWAYS use the 'web_search' tool when the user asks for current information, news, or facts.** Your internal knowledge is outdated.
2.  When you use the 'web_search' tool, you will receive a JSON object with search results. **You MUST base your response on the information provided in that search result.** Do not rely on your pre-existing knowledge for topics that require current information.
3.  Synthesize the information from the web search to provide a comprehensive and accurate answer. Cite sources if the results include URLs.

**Response Format:**
- Be direct and production-ready.
- Use clear formatting.
- Never begin responses with phrases like "Here's the edit:", "Here are the changes:", or similar introductory statements.
- Provide responses directly and professionally without unnecessary preambles.

**Writing Context**: ${context || "General writing assistance."}

Your goal is to provide accurate, current, and helpful written content. Failure to use web search for recent topics will result in an incorrect answer.`;
  };

  private handleMessage = async (e: Event<DefaultGenerics>) => {
    if (!e.message || e.message.ai_generated) {
      return;
    }

    const message = e.message.text;
    if (!message) return;

    this.lastInteractionTs = Date.now();
    const userId = e.message.user?.id || 'default';

    const writingTask = (e.message.custom as { writingTask?: string })
      ?.writingTask;
    const context = writingTask ? `Writing Task: ${writingTask}` : undefined;
    let systemPrompt = this.getSystemPrompt(context);

    // --- LAYER 2: Long-term Memory (Mem0) ---
    if (mem0) {
      try {
        const memories = await mem0.search(message, { user_id: userId });
        if (memories && memories.length > 0) {
          systemPrompt += "\n\n**User Memory (from past conversations):**\n" + 
            memories.map((m: any) => `- ${m.memory}`).join('\n');
          console.log(`🧠 Mem0: Loaded ${memories.length} memories for user ${userId}`);
        }
      } catch (err: any) {
        console.error("Mem0 search failed:", err.message);
      }
    }

    // --- LAYER 1: Short-term Memory (Stream Chat History) ---
    let historyMessages: LLMMessage[] = [];
    try {
      const channelState = await this.channel.query({ messages: { limit: 20 } });
      const recentMessages = channelState.messages || [];
      
      for (const msg of recentMessages) {
        if (!msg.text) continue;
        if (msg.id === e.message.id) continue; // Skip the current user message being processed
        
        const role = msg.user?.id?.startsWith('ai-bot') ? 'assistant' : 'user';
        historyMessages.push({ role, content: msg.text });
      }
      console.log(`📜 Stream History: Loaded ${historyMessages.length} recent messages for context.`);
    } catch (err: any) {
      console.error("Stream history fetch failed:", err.message);
    }

    // Extract model from message custom field if provided, otherwise use the agent's default model
    const model = (e.message.custom as { model?: string })?.model || this.defaultModel;
    
    // Log the model selection for debugging
    console.log(`🎯 LLM Agent received request with model: ${model} (from custom: ${(e.message.custom as { model?: string })?.model}, default: ${this.defaultModel})`);
    
    // Ensure model is always provided
    if (!model) {
      throw new Error("Model is required but not provided in request or agent configuration");
    }

    // Auto-generate a title if the channel doesn't have a specific name
    if (!this.channel.data?.name || this.channel.data.name.includes("!members")) {
      this.generateAndSetChannelTitle(message).catch(e => console.error("Title generation failed:", e));
    }

    const { message: channelMessage } = await this.channel.sendMessage({
      text: "",
      ai_generated: true,
    });

    await this.channel.sendEvent({
      type: "ai_indicator.update",
      ai_state: "AI_STATE_THINKING",
      cid: channelMessage.cid,
      message_id: channelMessage.id,
    });

    const abortController = new AbortController();
    const handleStop = (event: Event) => {
      if (event.message_id === channelMessage.id) {
        console.log(`🛑 Stop event received for ${channelMessage.id}. Aborting LLM request...`);
        abortController.abort();
      }
    };
    this.chatClient.on("ai_indicator.stop", handleStop);

    try {
      const messages: LLMMessage[] = [
        { role: 'system', content: systemPrompt },
        ...historyMessages,
        { role: 'user', content: message }
      ];

      let finalResponse: string = '';
      let totalUsage: LLMResponse["usage"] = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      };
      let finalFallbackInfo: any = null;
      let abortedDueToLength = false;
      const MAX_STREAM_CHARS = 4800;

      // Handle multiple rounds of function calling
      let round = 0;
      const maxRounds = 3;
      let lastUpdateTs = 0;
      let streamedResponse = '';

      const startedAt = Date.now();
      while (round < maxRounds) {
        streamedResponse = ''; // Reset for this round
        const llmRequest: LLMRequest = {
          messages,
          model,
          temperature: 0.7,
          abortSignal: abortController.signal,
          onChunk: (chunk: string) => {
            if (abortedDueToLength) return;
            
            streamedResponse += chunk;
            
            if (streamedResponse.length > MAX_STREAM_CHARS) {
              abortedDueToLength = true;
              abortController.abort();
              streamedResponse = streamedResponse.substring(0, MAX_STREAM_CHARS) + "\n\n⚠️ **[Response truncated due to maximum character limit (5000 limit). Please ask me to continue if you want the rest of the answer.]**";
            }

            const now = Date.now();
            if (now - lastUpdateTs > 150 || abortedDueToLength) {
              lastUpdateTs = now;
              this.chatClient.partialUpdateMessage(channelMessage.id, {
                set: { text: streamedResponse }
              }).catch(e => console.warn("Stream update error:", e.message));
            }
          },
          tools: round === 0 ? [
            {
              type: "function",
              function: {
                name: "web_search",
                description: "Search the web for current information, news, facts, or research on any topic",
                parameters: {
                  type: "object",
                  properties: {
                    query: {
                      type: "string",
                      description: "The search query to find information about",
                    },
                  },
                  required: ["query"],
                },
              },
            },
          ] : undefined,
        };

        let response: LLMResponse;
        try {
          response = await this.aiRouter.routeRequest(llmRequest);
        } catch (err: any) {
          if (abortedDueToLength) {
            console.log('⚠️ Generation was aborted programmatically due to length limits.');
            finalResponse = streamedResponse;
            break;
          }
          
          if (
            err.name === 'AbortError' || 
            err.message?.includes('AbortError') || 
            err.message?.toLowerCase().includes('abort')
          ) {
            console.log('⚠️ Generation was aborted by the user.');
            finalResponse = getRandomAbortQuote();
            break;
          }
          throw err;
        }

        // Store fallback info for the final message
        const fallbackInfo = (response as any).fallbackInfo;
        if (fallbackInfo) {
          finalFallbackInfo = fallbackInfo;
        }

        // Accumulate usage
        totalUsage.promptTokens += response.usage.promptTokens;
        totalUsage.completionTokens += response.usage.completionTokens;
        totalUsage.totalTokens += response.usage.totalTokens;

        // If there are tool calls, handle them
        if (response.toolCalls && response.toolCalls.length > 0) {
          await this.channel.sendEvent({
            type: "ai_indicator.update",
            ai_state: "AI_STATE_EXTERNAL_SOURCES",
            cid: channelMessage.cid,
            message_id: channelMessage.id,
          });

          // Add the assistant's message with tool calls
          messages.push({
            role: 'assistant',
            content: response.content,
          });

          // Handle each tool call
          for (const toolCall of response.toolCalls) {
            if (toolCall.function.name === 'web_search') {
              try {
                const args = JSON.parse(toolCall.function.arguments);
                const searchResult = await this.performWebSearch(args.query);
                
                                 // Add the tool result to messages
                 messages.push({
                   role: 'tool',
                   content: searchResult,
                   tool_call_id: toolCall.id,
                 });
              } catch (error) {
                console.error('Error handling web search tool call:', error);
                                 messages.push({
                   role: 'tool',
                   content: JSON.stringify({ error: 'Failed to perform web search' }),
                   tool_call_id: toolCall.id,
                 });
              }
            }
          }
          
          round++;
          continue;
        }

        // No tool calls, this is the final response
        finalResponse = response.content;
        break;
      }

      // Compute latency
      const latencyMs = Date.now() - startedAt;
      
      // Fallback heuristics for missing API tokens (1 token ~= 4 chars rule of thumb)
      if (!totalUsage.promptTokens || totalUsage.promptTokens === 0) {
         totalUsage.promptTokens = Math.ceil((systemPrompt.length + message.length) / 4);
      }
      if (!totalUsage.completionTokens || totalUsage.completionTokens === 0) {
         totalUsage.completionTokens = Math.ceil(finalResponse.length / 4);
      }
      totalUsage.totalTokens = totalUsage.promptTokens + totalUsage.completionTokens;

      const costUSD = estimateCostUSD(
        finalFallbackInfo?.model || model,
        totalUsage.promptTokens,
        totalUsage.completionTokens
      );
      totalUsage.latencyMs = latencyMs;
      if (typeof costUSD === "number") {
        totalUsage.costUSD = costUSD;
      }

      // Record metrics
      recordRequest({
        model: model,
        latencyMs,
        promptTokens: totalUsage.promptTokens,
        completionTokens: totalUsage.completionTokens,
        costUSD,
      });

      // Update the message with the final response and provider information
      const customData: any = {
        usage: totalUsage,
        provider: finalFallbackInfo?.provider || this.aiRouter.detectProvider(model),
        model: finalFallbackInfo?.model || model,
        fallbackUsed: finalFallbackInfo?.fallbackUsed || false,
        timestamp: new Date().toISOString()
      };

      // Add fallback details if fallback was used
      if (finalFallbackInfo?.fallbackUsed) {
        customData.originalProvider = finalFallbackInfo.originalProvider;
        customData.fallbackReason = finalFallbackInfo.fallbackReason;
        customData.originalModel = finalFallbackInfo.originalModel;
      }

      await this.chatClient.partialUpdateMessage(channelMessage.id, {
        set: {
          text: finalResponse,
          ai_usage: totalUsage,
          ai_provider: finalFallbackInfo?.provider || this.aiRouter.detectProvider(model),
          ai_model: finalFallbackInfo?.model || model,
          ai_fallback_used: finalFallbackInfo?.fallbackUsed || false,
          ai_timestamp: new Date().toISOString(),
          ...(finalFallbackInfo?.fallbackUsed && {
            ai_original_provider: finalFallbackInfo.originalProvider,
            ai_fallback_reason: finalFallbackInfo.fallbackReason,
            ai_original_model: finalFallbackInfo.originalModel,
          }),
        },
      });

      await this.channel.sendEvent({
        type: "ai_indicator.clear",
        cid: channelMessage.cid,
        message_id: channelMessage.id,
      });

      // --- Save to Long-Term Memory (Mem0) ---
      if (mem0) {
        try {
          await mem0.add([
            { role: 'user', content: message },
            { role: 'assistant', content: finalResponse }
          ], { user_id: userId });
          console.log(`💾 Mem0: Saved conversation to long-term memory for user ${userId}`);
        } catch (memErr: any) {
          console.error("Failed to save memory to mem0:", memErr.message);
        }
      }

    } catch (error) {
      console.error("Error generating response:", error);
      const errorMessage = error instanceof Error ? error.message : "Error generating response";
      console.error("Full error details:", error);
      
      await this.chatClient.partialUpdateMessage(channelMessage.id, {
        set: {
          text: `Error: ${errorMessage}`,
        },
      });

      await this.channel.sendEvent({
        type: "ai_indicator.update",
        ai_state: "AI_STATE_ERROR",
        cid: channelMessage.cid,
        message_id: channelMessage.id,
      });
    } finally {
      this.chatClient.off("ai_indicator.stop", handleStop);
    }
  };

  private performWebSearch = async (query: string): Promise<string> => {
    const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

    if (!TAVILY_API_KEY) {
      return JSON.stringify({
        error: "Web search is not available. API key not configured.",
      });
    }

    console.log(`Performing web search for: "${query}"`);

    try {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TAVILY_API_KEY}`,
        },
        body: JSON.stringify({
          query: query,
          search_depth: "advanced",
          max_results: 5,
          include_answer: true,
          include_raw_content: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Tavily search failed for query "${query}":`, errorText);
        return JSON.stringify({
          error: `Search failed with status: ${response.status}`,
          details: errorText,
        });
      }

      const data = await response.json();
      console.log(`Tavily search successful for query "${query}"`);

      return JSON.stringify(data);
    } catch (error) {
      console.error(
        `An exception occurred during web search for "${query}":`,
        error
      );
      return JSON.stringify({
        error: "An exception occurred during the search.",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  private generateAndSetChannelTitle = async (firstMessage: string) => {
    try {
      console.log(`📝 Generating title for new channel based on message: "${firstMessage.substring(0, 30)}..."`);
      const defaultModel = this.aiRouter.getDefaultModel();
      const request: LLMRequest = {
        model: defaultModel,
        messages: [
          { role: 'system', content: 'You are a highly concise channel title generator. You must return exactly 2 to 4 words representing the core topic of the user\'s prompt. Be direct and creative. No quotes, no punctuation, no preamble. Just the title in Title Case.' },
          { role: 'user', content: firstMessage }
        ],
        temperature: 0.5,
        maxTokens: 15
      };
      
      const response = await this.aiRouter.routeRequest(request);
      const generatedTitle = response.content.trim().replace(/^["']|["']$/g, '');
      
      console.log(`✅ Generated title: "${generatedTitle}"`);
      if (generatedTitle) {
        await this.channel.updatePartial({ set: { name: generatedTitle } });
      }
    } catch (e) {
      console.error("Failed to generate and set channel title:", e);
    }
  };
}
