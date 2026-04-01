import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Bot, Check, Copy, Square, Volume2, ChevronDown, ChevronUp, AlertTriangle, Zap, RefreshCw } from "lucide-react";
import React, { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  useAIState,
  useChannelStateContext,
  useMessageContext,
} from "stream-chat-react";
import { MODEL_OPTIONS } from "./model-selector";

const ChatMessage: React.FC = () => {
  const { message } = useMessageContext();
  const { channel } = useChannelStateContext();
  const { aiState } = useAIState(channel);

  const isUser = !message.user?.id?.startsWith("ai-bot");
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [showFallbackDetails, setShowFallbackDetails] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const copyToClipboard = async () => {
    const textToCopy = message.text || "";
    if (!textToCopy) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Fallback for non-secure contexts (e.g. testing on local network IP)
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.position = "absolute";
        textArea.style.left = "-999999px";
        document.body.prepend(textArea);
        textArea.select();
        try {
          document.execCommand("copy");
        } catch (error) {
          console.error("Fallback copy failed", error);
        } finally {
          textArea.remove();
        }
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const toggleSpeak = () => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    if (speaking) {
      try {
        synth.cancel();
      } finally {
        setSpeaking(false);
      }
      return;
    }

    const text = message.text || "";
    if (!text.trim()) return;

    // Stop any ongoing speech before starting this one
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => {
      setSpeaking(false);
      utteranceRef.current = null;
    };
    utterance.onerror = () => {
      setSpeaking(false);
      utteranceRef.current = null;
    };
    utteranceRef.current = utterance;
    setSpeaking(true);
    synth.speak(utterance);
  };

  const getAiStateMessage = () => {
    switch (aiState) {
      case "AI_STATE_THINKING":
        return "Thinking...";
      case "AI_STATE_GENERATING":
        return "Generating response...";
      case "AI_STATE_EXTERNAL_SOURCES":
        return "Accessing external sources...";
      case "AI_STATE_ERROR":
        return "An error occurred.";
      default:
        return null;
    }
  };

  const formatTime = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Extract provider information from message
  const getProviderInfo = () => {
    const rootMessage = message as any;
    const customData = rootMessage?.custom;
    return {
      provider: customData?.provider || rootMessage?.ai_provider || null,
      model: customData?.model || rootMessage?.ai_model || null,
      fallbackUsed: customData?.fallbackUsed || rootMessage?.ai_fallback_used || false,
      originalProvider: customData?.originalProvider || rootMessage?.ai_original_provider || null,
      fallbackReason: customData?.fallbackReason || rootMessage?.ai_fallback_reason || null,
      attempts: customData?.attempts || rootMessage?.ai_attempts || []
    };
  };

  // Get provider display name and icon
  const getProviderDisplay = (provider: string) => {
    const providers: Record<string, { name: string; icon: string; color: string }> = {
      'openai': { name: 'OpenAI', icon: '🤖', color: 'text-green-600' },
      'openrouter': { name: 'OpenRouter', icon: '🔄', color: 'text-blue-600' },
      'gemini': { name: 'Google Gemini', icon: '✨', color: 'text-purple-600' },
      'claude': { name: 'Anthropic Claude', icon: '🧠', color: 'text-orange-600' },
      'anthropic': { name: 'Anthropic', icon: '🧠', color: 'text-orange-600' }
    };
    return providers[provider?.toLowerCase()] || { name: provider, icon: '🤖', color: 'text-gray-600' };
  };

  // Get fallback reason display
  const getFallbackReasonDisplay = (reason: string) => {
    const reasons: Record<string, { text: string; icon: JSX.Element; color: string }> = {
      'quota_exceeded': { 
        text: 'OpenAI quota exceeded', 
        icon: <AlertTriangle className="h-3 w-3" />, 
        color: 'text-amber-600' 
      },
      'rate_limit': { 
        text: 'Rate limit reached', 
        icon: <AlertTriangle className="h-3 w-3" />, 
        color: 'text-red-600' 
      },
      'api_error': { 
        text: 'API error occurred', 
        icon: <AlertTriangle className="h-3 w-3" />, 
        color: 'text-red-600' 
      },
      'timeout': { 
        text: 'Request timeout', 
        icon: <AlertTriangle className="h-3 w-3" />, 
        color: 'text-yellow-600' 
      },
      'fallback': { 
        text: 'Automatic fallback', 
        icon: <RefreshCw className="h-3 w-3" />, 
        color: 'text-blue-600' 
      }
    };
    return reasons[reason] || { 
      text: reason || 'Unknown error', 
      icon: <AlertTriangle className="h-3 w-3" />, 
      color: 'text-gray-600' 
    };
  };

  const renderUsage = () => {
    if (isUser) return null;
    const rootMessage = message as any;
    const usage = rootMessage?.custom?.usage || rootMessage?.ai_usage as
      | {
          promptTokens?: number;
          completionTokens?: number;
          totalTokens?: number;
          costUSD?: number;
          latencyMs?: number;
        }
      | undefined;
      
    const providerInfo = getProviderInfo();
    const modelValue = providerInfo.model || rootMessage?.custom?.model || "";
    const displayModelName = MODEL_OPTIONS.find(opt => opt.value === modelValue)?.label || modelValue || "AI";
    const currentProviderDisplay = getProviderDisplay(providerInfo.provider || "");

    const totalTokens = usage?.totalTokens || 0;
    const cost = usage && typeof usage.costUSD === "number" ? (usage.costUSD === 0 ? "Free" : `$${usage.costUSD.toFixed(4)}`) : "-";
    const latency = usage && typeof usage.latencyMs === "number" ? `${(usage.latencyMs / 1000).toFixed(2)}s` : "-";

    const isFallback = providerInfo.fallbackUsed;

    return (
      <div className={cn(
        "mt-3 pt-2 border-t flex flex-wrap items-center gap-2 text-[11px] select-none",
        isFallback ? "border-amber-500/20" : "border-border/30"
      )}>
        {/* Model ID Badge */}
        <div className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-medium",
          isFallback 
            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-sm shadow-amber-500/5" 
            : "bg-muted text-muted-foreground border border-muted-foreground/10"
        )}>
          {isFallback ? (
            <AlertTriangle className="h-3 w-3" />
          ) : (
            <span>{currentProviderDisplay.icon}</span>
          )}
          <span>{isFallback ? `Fallback: ${displayModelName}` : displayModelName}</span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 font-mono text-muted-foreground/70">
          <span>Tokens: {totalTokens > 0 ? totalTokens : "..."}</span>
          <span className="opacity-40">•</span>
          <span>Cost: {cost}</span>
          <span className="opacity-40">•</span>
          <span>Latency: {latency}</span>
        </div>
      </div>
    );
  };

  return (
    <div
      className={cn(
        "flex w-full mb-4 px-4 group",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "flex max-w-[70%] sm:max-w-[60%] lg:max-w-[50%]",
          isUser ? "flex-row-reverse" : "flex-row"
        )}
      >
        {/* Avatar */}
        {!isUser && (
          <div className="flex-shrink-0 mr-3 self-end">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-muted text-muted-foreground">
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          </div>
        )}

        {/* Message Content */}
        <div className="flex flex-col space-y-1">
          {/* Message Bubble gets Top Provider badge removed to make UI clean */}

          {/* Message Bubble */}
          <div
            className={cn(
              "px-4 py-3 rounded-2xl text-sm leading-relaxed transition-all duration-200",
              isUser
                ? "str-chat__message-bubble str-chat__message-bubble--me rounded-br-md"
                : "str-chat__message-bubble rounded-bl-md"
            )}
          >
            {/* Message Text */}
            <div className="break-words">
              <ReactMarkdown
                components={{
                  p: ({ children }) => (
                    <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>
                  ),
                  code: ({ children, ...props }) => {
                    const { node, ...rest } = props;
                    const isInline = !rest.className?.includes("language-");

                    return isInline ? (
                      <code
                        className="px-1.5 py-0.5 rounded text-xs font-mono bg-black/10 dark:bg-white/10"
                        {...rest}
                      >
                        {children}
                      </code>
                    ) : (
                      <pre className="p-3 rounded-md overflow-x-auto my-2 text-xs font-mono bg-black/5 dark:bg-white/5">
                        <code {...rest}>{children}</code>
                      </pre>
                    );
                  },
                  ul: ({ children }) => (
                    <ul className="list-disc ml-4 mb-3 space-y-1">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal ml-4 mb-3 space-y-1">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="leading-relaxed">{children}</li>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-3 pl-3 my-2 italic border-current/30">
                      {children}
                    </blockquote>
                  ),
                  h1: ({ children }) => (
                    <h1 className="text-lg font-semibold mb-2 mt-4 first:mt-0">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-base font-semibold mb-2 mt-3 first:mt-0">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-sm font-semibold mb-2 mt-3 first:mt-0">
                      {children}
                    </h3>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold">{children}</strong>
                  ),
                  em: ({ children }) => <em className="italic">{children}</em>,
                }}
              >
                {message.text || ""}
              </ReactMarkdown>
            </div>

            {renderUsage()}

            {/* Loading State */}
            {aiState && !message.text && (
              <div className="flex items-center gap-2 mt-2 pt-2">
                <span className="text-xs opacity-70">
                  {getAiStateMessage()}
                </span>
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-current rounded-full typing-dot opacity-70"></div>
                  <div className="w-1 h-1 bg-current rounded-full typing-dot opacity-70"></div>
                  <div className="w-1 h-1 bg-current rounded-full typing-dot opacity-70"></div>
                </div>
              </div>
            )}
          </div>

          {/* Timestamp and Actions */}
          <div className="flex items-center justify-between px-1">
            {/* Timestamp - Always left aligned */}
            <span className="text-xs text-muted-foreground/70">
              {formatTime(message.created_at || new Date())}
            </span>

            {/* Actions - Only for AI messages, always right aligned */}
            {!isUser && !!(message.text) && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSpeak}
                  className="h-6 px-2 text-xs hover:bg-muted rounded-md"
                  title={speaking ? "Stop" : "Listen"}
                >
                  {speaking ? (
                    <>
                      <Square className="h-3 w-3 mr-1" />
                      <span>Stop</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-3 w-3 mr-1" />
                      <span>Listen</span>
                    </>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyToClipboard}
                  className="h-6 px-2 text-xs hover:bg-muted rounded-md"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 mr-1 text-green-600" />
                      <span className="text-green-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      <span>Copy</span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
