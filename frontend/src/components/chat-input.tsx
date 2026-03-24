import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ArrowRight, Square, X, Mic, WifiOff } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { WritingPromptsToolbar } from "./writing-prompts-toolbar";

export interface ChatInputProps {
  className?: string;
  sendMessage: (message: { text: string }) => Promise<void> | void;
  isGenerating?: boolean;
  onStopGenerating?: () => void;
  placeholder?: string;
  value: string;
  onValueChange: (text: string) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  showPromptToolbar?: boolean;
  /** Whether the chat service connection is active */
  isConnected?: boolean;
  /** Called when user clicks the embedded Connect button */
  onConnect?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  className,
  sendMessage,
  isGenerating,
  onStopGenerating,
  placeholder = "Ask me to write something, or paste text to improve...",
  value,
  onValueChange,
  textareaRef: externalTextareaRef,
  showPromptToolbar = false,
  isConnected = true,
  onConnect,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [offlineAttempt, setOfflineAttempt] = useState(false);
  const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalTextareaRef || internalTextareaRef;
  const recognitionRef = useRef<any | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [hasSpeechSupport, setHasSpeechSupport] = useState(true);

  const handlePromptSelect = (prompt: string) => {
    // Append the prompt to existing text or set it if empty
    onValueChange(value ? `${value.trim()} ${prompt}` : prompt);
    textareaRef.current?.focus();
  };

  // Auto-resize textarea
  const updateTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 120; // ~6 lines
      const textareaHeight = Math.min(scrollHeight, maxHeight);
      textarea.style.height = `${textareaHeight}px`;
    }
  }, [textareaRef]);

  // Auto-resize textarea
  useEffect(() => {
    updateTextareaHeight();
  }, [value, updateTextareaHeight]);

  // Detect Web Speech API support
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setHasSpeechSupport(false);
      return;
    }
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = navigator.language || "en-US";

    recognitionRef.current.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = value || "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript = (finalTranscript ? finalTranscript + " " : "") + transcript.trim();
        } else {
          interimTranscript += transcript;
        }
      }
      // Prefer final when available; otherwise show interim appended
      const nextText = (finalTranscript || value || "") + (interimTranscript ? (finalTranscript ? " " : "") + interimTranscript : "");
      onValueChange(nextText.trimStart());
    };

    recognitionRef.current.onerror = () => {
      setIsRecording(false);
    };

    recognitionRef.current.onend = () => {
      setIsRecording(false);
    };
  }, []);

  const startRecording = () => {
    if (!recognitionRef.current || isRecording || isLoading || isGenerating) return;
    try {
      recognitionRef.current.start();
      setIsRecording(true);
      // Focus input so user sees live transcription
      textareaRef.current?.focus();
    } catch (e) {
      // no-op
    }
  };

  const stopRecording = () => {
    if (!recognitionRef.current || !isRecording) return;
    try {
      recognitionRef.current.stop();
    } catch (e) {
      // no-op
    } finally {
      setIsRecording(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || isLoading || isGenerating || !sendMessage) return;

    // If not connected, show inline notice and DON'T send
    if (!isConnected) {
      setOfflineAttempt(true);
      setTimeout(() => setOfflineAttempt(false), 4000);
      return;
    }

    setIsLoading(true);
    try {
      await sendMessage({ text: value.trim() });
      onValueChange("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const offlinePlaceholder = "You're offline — connect to send messages";

  return (
    <div
      className={cn(
        "flex flex-col bg-background",
        showPromptToolbar && "border-t border-border/50"
      )}
    >
      {showPromptToolbar && (
        <WritingPromptsToolbar onPromptSelect={handlePromptSelect} />
      )}

      {/* Offline inline notice — shown when user tries to send while disconnected */}
      {offlineAttempt && (
        <div className="mx-4 mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 animate-in slide-in-from-bottom-2 duration-200">
          <WifiOff className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="flex-1 text-xs text-amber-700 dark:text-amber-400">
            Not connected — this message wasn't sent to the AI model.
          </span>
          {onConnect && (
            <button
              onClick={() => { onConnect(); setOfflineAttempt(false); }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors animate-pulse hover:animate-none"
            >
              Connect
            </button>
          )}
        </div>
      )}

      <div className={cn("p-4", className)}>
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onValueChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={!isConnected ? offlinePlaceholder : placeholder}
              className={cn(
                "min-h-[44px] max-h-[120px] resize-none py-3 pl-4 pr-20 text-sm",
                "border-input focus:border-primary/50 rounded-lg",
                "transition-colors duration-200 bg-background",
                !isConnected && "border-amber-400/60 focus:border-amber-500/70 placeholder:text-amber-600/60 dark:placeholder:text-amber-400/60"
              )}
              disabled={isLoading || isGenerating}
            />

            {/* Clear button */}
            {value.trim() && !isLoading && !isGenerating && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onValueChange("")}
                className="absolute right-12 bottom-2 h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
                title="Clear text"
              >
                <X className="h-4 w-4" />
              </Button>
            )}

            {/* Microphone button */}
            <Button
              type="button"
              variant={isRecording ? "destructive" : "ghost"}
              size="icon"
              disabled={!hasSpeechSupport || isLoading || isGenerating}
              onClick={isRecording ? stopRecording : startRecording}
              className="absolute right-20 bottom-2 h-8 w-8 rounded-md text-muted-foreground hover:text-foreground disabled:opacity-40"
              title={hasSpeechSupport ? (isRecording ? "Stop recording" : "Start voice input") : "Voice input not supported"}
            >
              <div className="relative">
                <Mic className="h-4 w-4" />
                {isRecording && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
                )}
              </div>
            </Button>

            {/* Send/Stop Button inside textarea */}
            {isGenerating ? (
              <Button
                type="button"
                onClick={onStopGenerating}
                className="absolute right-2 bottom-2 h-8 w-8 rounded-md flex-shrink-0 p-0"
                variant="destructive"
                title="Stop generating"
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : !isConnected ? (
              /* Offline state — amber send icon, clicking shows the notice */
              <Button
                type="submit"
                disabled={!value.trim() || isLoading}
                className={cn(
                  "absolute right-2 bottom-2 h-8 w-8 rounded-md flex-shrink-0 p-0",
                  "transition-all duration-200",
                  value.trim()
                    ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-600"
                    : "bg-muted text-muted-foreground",
                  "disabled:opacity-30 disabled:cursor-not-allowed"
                )}
                title="Not connected — click to see details"
              >
                <WifiOff className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={!value.trim() || isLoading || isGenerating}
                className={cn(
                  "absolute right-2 bottom-2 h-8 w-8 rounded-md flex-shrink-0 p-0",
                  "transition-all duration-200",
                  "disabled:opacity-30 disabled:cursor-not-allowed",
                  !value.trim() ? "bg-muted hover:bg-muted" : ""
                )}
                variant={value.trim() ? "default" : "ghost"}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
