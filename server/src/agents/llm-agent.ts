import type { Channel, DefaultGenerics, Event, StreamChat } from "stream-chat";
import type { AIAgent } from "./types";
import { LLMFactory } from "../llm/llm-factory";
import { LLMRequest, LLMMessage, LLMResponse } from "../llm/types";
import { estimateCostUSD } from "../llm/pricing";
import { recordRequest } from "../metrics";

export class LLMAgent implements AIAgent {
  private llmFactory: LLMFactory;
  private lastInteractionTs = Date.now();

  constructor(
    readonly chatClient: StreamChat,
    readonly channel: Channel
  ) {
    this.llmFactory = new LLMFactory();
  }

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

    const writingTask = (e.message.custom as { writingTask?: string })
      ?.writingTask;
    const context = writingTask ? `Writing Task: ${writingTask}` : undefined;
    const systemPrompt = this.getWritingAssistantPrompt(context);

    // Extract model from message custom field if provided
    const model = (e.message.custom as { model?: string })?.model;

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

    try {
      const messages: LLMMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ];

      let finalResponse: string = '';
      let totalUsage: LLMResponse["usage"] = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      };

      // Handle multiple rounds of function calling
      let round = 0;
      const maxRounds = 3;

      const startedAt = Date.now();
      while (round < maxRounds) {
        const llmRequest: LLMRequest = {
          messages,
          model,
          temperature: 0.7,
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

        const response = await this.llmFactory.generate(llmRequest);

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

      // Compute latency and cost
      const latencyMs = Date.now() - startedAt;
      const costUSD = estimateCostUSD(
        model || this.llmFactory.getDefaultModel(),
        totalUsage.promptTokens,
        totalUsage.completionTokens
      );
      totalUsage.latencyMs = latencyMs;
      if (typeof costUSD === "number") {
        totalUsage.costUSD = costUSD;
      }

      // Record metrics
      recordRequest({
        model: model || this.llmFactory.getDefaultModel(),
        latencyMs,
        promptTokens: totalUsage.promptTokens,
        completionTokens: totalUsage.completionTokens,
        costUSD,
      });

      // Update the message with the final response
      await this.chatClient.partialUpdateMessage(channelMessage.id, {
        set: {
          text: finalResponse,
          custom: {
            usage: totalUsage,
            model: model || this.llmFactory.getDefaultModel(),
          },
        },
      });

      await this.channel.sendEvent({
        type: "ai_indicator.clear",
        cid: channelMessage.cid,
        message_id: channelMessage.id,
      });

    } catch (error) {
      console.error("Error generating response:", error);
      await this.chatClient.partialUpdateMessage(channelMessage.id, {
        set: {
          text: error instanceof Error ? error.message : "Error generating response",
        },
      });

      await this.channel.sendEvent({
        type: "ai_indicator.update",
        ai_state: "AI_STATE_ERROR",
        cid: channelMessage.cid,
        message_id: channelMessage.id,
      });
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
}
