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

    // ── TEMPORAL CLASSIFIER ─────────────────────────────────────────────────
    // Classify the query BEFORE any AI call so we can pre-fetch fresh data
    // for time-sensitive questions and inject it as ground-truth context.
    const queryType = this.classifyQuery(message);
    console.log(`🕐 Temporal Classifier: "${message.substring(0, 60)}..." → ${queryType}`);

    let proactiveSearchResult: string | null = null;
    if (queryType === 'TIME_SENSITIVE') {

      // FIX 2 — Skip Tavily for pure date/time questions.
      // The date is already injected into the system prompt via new Date(),
      // so a web search would be wasteful and return irrelevant results.
      const pureDatePatterns = [
        /^what(?:'s| is) today(?:'s date)?[?!.]?$/,
        /^what(?:'s| is) the date(?: today)?[?!.]?$/,
        /^what day is it[?!.]?$/,
        /^what(?:'s| is) the (current )?date[?!.]?$/,
        /^what(?:'s| is) (the )?time[?!.]?$/,
        /^what time is it[?!.]?$/,
        /^tell me (today's date|the date|the time)[?!.]?$/,
        /^(today's date|current date|current time)[?!.]?$/,
      ];
      const isPureDateQuestion = pureDatePatterns.some(p => p.test(message.toLowerCase().trim()));

      if (isPureDateQuestion) {
        console.log(`📅 Pure date/time question detected — skipping Tavily, date is already in system prompt`);
      } else {
        // FIX 1 — Enrich the Tavily query with today's date so results are
        // anchored to now and Tavily doesn't return outdated content.
        const now = new Date();
        const dateLabel = now.toLocaleDateString('en-US', {
          month: 'long', day: 'numeric', year: 'numeric'   // e.g. "April 6, 2026"
        });
        const enrichedQuery = `${message} ${dateLabel}`;
        console.log(`🔍 TIME_SENSITIVE — enriched Tavily query: "${enrichedQuery}"`);

        const rawSearchResult = await this.performWebSearch(enrichedQuery);
        // FIX 3: If Tavily returns an error payload, suppress it entirely.
        // Do NOT inject error JSON into the AI context — the AI responds from training data instead.
        if (!rawSearchResult.includes('"error"')) {
          proactiveSearchResult = rawSearchResult;
          console.log(`✅ Tavily search successful — injecting results into context`);
        } else {
          console.log(`⚠️ Tavily search returned an error payload — skipping injection, AI will use training data`);
        }
      }
    }
    // ────────────────────────────────────────────────────────────────────────

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

    // FIX 4: Merge search results INTO the single system message (not a separate
    // second system message). This avoids dual-system-message issues with
    // Gemini and Claude adapters that don't support consecutive system roles.
    let requestSystemPrompt = systemPrompt;
    if (proactiveSearchResult) {
      requestSystemPrompt =
        `IMPORTANT INSTRUCTION FOR THIS RESPONSE ONLY: Fresh live web search ` +
        `results are appended at the end of this system message. These results ` +
        `are your ground truth for this response. Do NOT rely on your training ` +
        `knowledge where it conflicts with the search results — ALWAYS prefer ` +
        `the search results over your training data.\n\n` +
        systemPrompt +
        `\n\n[LIVE WEB SEARCH RESULTS — retrieved ${new Date().toUTCString()}]:\n${proactiveSearchResult}`;
    }

    try {
      // Single system message always — search results are embedded inside it when present.
      const messages: LLMMessage[] = [
        { role: 'system', content: requestSystemPrompt },
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

        // The streaming callback — only used on round 0 (direct response).
        // On tool-call follow-up rounds we disable streaming to avoid sending
        // partial intermediate text to the UI.
        const onChunkHandler = round === 0 ? (chunk: string) => {
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
        } : undefined;

        const llmRequest: LLMRequest = {
          messages,
          model,
          temperature: 0.7,
          abortSignal: abortController.signal,
          onChunk: onChunkHandler,
          // Only offer tools on the first round; subsequent rounds process results
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

          // CRITICAL FIX: Push the assistant message WITH tool_calls attached.
          // Without this, the next LLM call receives an assistant turn with no
          // content AND no tool_calls — triggering "model output must contain
          // either output text or tool calls" from OpenAI / Claude / Gemini.
          (messages as any[]).push({
            role: 'assistant',
            content: response.content || null,
            tool_calls: response.toolCalls.map(tc => ({
              id: tc.id,
              type: tc.type,
              function: {
                name: tc.function.name,
                arguments: tc.function.arguments,
              },
            })),
          });

          // Handle each tool call
          for (const toolCall of response.toolCalls) {
            if (toolCall.function.name === 'web_search') {
              try {
                const args = JSON.parse(toolCall.function.arguments);
                const searchResult = await this.performWebSearch(args.query);
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

        // No tool calls — this is the final text response
        finalResponse = response.content || streamedResponse;
        break;
      }

      // If we exhausted all rounds (e.g. 3 tool call turns with no text reply), use last streamed text
      if (!finalResponse && streamedResponse) {
        finalResponse = streamedResponse;
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

  /**
   * TEMPORAL CLASSIFIER
   *
   * Categorises a user message into one of three types:
   *   TIMELESS       — answer never changes (math, writing, history with year, code)
   *   SLOW_CHANGE    — answer changes over months/years (CEO, population, laws)
   *   TIME_SENSITIVE — answer requires up-to-date knowledge
   *
   * CHECK ORDER (FIX 1):
   *   1. TIME_SENSITIVE keywords  — checked FIRST, wins immediately
   *   2. TIME_SENSITIVE phrases   — checked SECOND
   *   3. TIMELESS patterns        — only reached when ZERO time-sensitive signals found
   *   4. SLOW_CHANGE / DEFAULT    — last resort
   *
   * This order ensures messages like "write me a poem about today's weather"
   * correctly return TIME_SENSITIVE instead of being short-circuited by "write".
   */
  private classifyQuery = (message: string): 'TIMELESS' | 'SLOW_CHANGE' | 'TIME_SENSITIVE' => {
    const q = message.toLowerCase().trim();

    // ── STEP 1: TIME_SENSITIVE keywords (checked FIRST) ───────────────────
    // FIX 2: Expanded list with previously missing temporal phrases.
    const timeSensitiveKeywords = [
      // Explicit time references
      'today', 'yesterday', 'right now', 'currently', 'at the moment',
      'this week', 'this month', 'this year', 'this season',
      'this morning', 'last night', 'last week', 'just now',
      'earlier today', 'few hours ago', 'few days ago', 'past week',
      // Recent-event phrases
      'recently happened', 'did india win', 'did they win', 'did we win',
      'latest', 'recent', 'just happened', 'just announced', 'just released',
      'breaking', 'live', 'live score', 'live result',
      // News & status
      'news', 'update', 'announcement', 'press release',
      // Sports
      'score', 'result', 'match', 'fixture', 'standings', 'leaderboard',
      'tournament', 'championship', 'playoff', 'final', 'semifinal',
      'ipl', 'nba', 'nfl', 'epl', 'premier league', 'world cup', 'copa',
      // Politics
      'election', 'vote', 'poll', 'referendum',
      // Finance
      'stock', 'share price', 'crypto', 'bitcoin', 'ethereum', 'market',
      // Weather
      'weather', 'forecast', 'temperature', 'rain',
      // Product / launch
      'release date', 'launched', 'available now',
      // Health
      'covid', 'pandemic', 'outbreak',
    ];
    if (timeSensitiveKeywords.some(kw => q.includes(kw))) {
      return 'TIME_SENSITIVE';
    }

    // ── STEP 2: TIME_SENSITIVE phrase patterns ────────────────────────────
    const timeSensitivePatterns = [
      /\b(who (won|is winning|leads|is ahead))\b/,
      /\b(what (is the (current|latest|new)|happened|are the results?))\b/,
      /\b(is .{1,40} still\b)/,              // "is X still happening / open / alive"
      /\b(how did .{1,40}(perform|do|play|end))\b/,
      /\b(what is .{1,30}(price|rate|value|cost) (of|for|today))\b/,
      /\b(when (does|did|will) .{1,40}(open|close|start|end|launch|release))\b/,
      /\b(who is (the )?(current|new|incoming|outgoing) (ceo|president|prime minister|chancellor|manager|coach|caption|leader|head))\b/,
      /\b(what (happened|is happening) (in|at|with|to))\b/,
      /\b(any (news|update|announcement|statement) (about|on|from|regarding))\b/,
    ];
    if (timeSensitivePatterns.some(p => p.test(q))) {
      return 'TIME_SENSITIVE';
    }

    // ── STEP 3: Hard TIMELESS patterns ───────────────────────────────────
    // Only reached when ZERO time-sensitive signals were found above.
    // Catches: math, writing tasks, coding, definitions, historical facts with year.
    const timelessPatterns = [
      /\b(\d+\s*[+\-*/^%]\s*\d+)/,            // arithmetic expression
      /\b(calculate|compute|solve|simplify|integrate|differentiate|prove|derive)\b/,
      /\b(write|draft|compose|rewrite|edit|summarize|paraphrase|translate|proofread)\b/,
      /\b(what is the (definition|meaning|concept|formula|syntax) of)\b/,
      /\b(explain|describe|how does|why does|what is|what are)\b.{0,30}\b(algorithm|function|method|syntax|pattern|concept|principle)\b/,
      /\b(in \d{4}|during (the )?(1\d{3}|20[0-1]\d)|\d{4} (war|revolution|election|treaty))\b/,
      /\b(code|debug|fix|refactor|implement|function|class|variable|loop|array|object|string|regex|sql|query|api|endpoint)\b/,
      /\b(grammar|spelling|punctuation|essay|paragraph|sentence|word|synonym|antonym)\b/,
      /\b(recipe|ingredient|cook|bake|how to make)\b/,
      /\b(convert|km to miles|celsius to fahrenheit|bytes? to|unit conversion)\b/,
    ];
    if (timelessPatterns.some(p => p.test(q))) {
      return 'TIMELESS';
    }

    // ── STEP 4: SLOW_CHANGE heuristics ───────────────────────────────────
    // Things that change but not hourly — classified as TIMELESS for now.
    const slowChangePatterns = [
      /\b(population of|gdp of|capital (city )?of|currency of)\b/,
      /\b(who (founded|created|invented|started)|when was .{1,40}founded)\b/,
      /\b(headquarters of|office of)\b/,
    ];
    if (slowChangePatterns.some(p => p.test(q))) {
      return 'SLOW_CHANGE';
    }

    // Default: treat as TIMELESS (err on the side of not over-searching)
    return 'TIMELESS';
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
