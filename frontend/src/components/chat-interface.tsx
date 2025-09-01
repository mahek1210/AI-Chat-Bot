import { useAIAgentStatus } from "@/hooks/use-ai-agent-status";
import { useModel } from "@/contexts/model-context";
import {
  Bot,
  Briefcase,
  FileText,
  Lightbulb,
  Menu,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { useRef, useState } from "react";
import {
  Channel,
  MessageList,
  useAIState,
  useChannelActionContext,
  useChannelStateContext,
  useChatContext,
  Window,
} from "stream-chat-react";
import { AIAgentControl } from "./ai-agent-control";
import { ChatInput, ChatInputProps } from "./chat-input";
import ChatMessage from "./chat-message";
import { ModelSelector } from "./model-selector";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { BarChart2 } from "lucide-react";

interface ChatInterfaceProps {
  onToggleSidebar: () => void;
  onNewChatMessage: (message: { text: string }) => Promise<void>;
  backendUrl: string;
}

const EmptyStateWithInput: React.FC<{
  onNewChatMessage: ChatInputProps["sendMessage"];
}> = ({ onNewChatMessage }) => {
  const [inputText, setInputText] = useState("");

  // Research-based writing prompts organized by category
  const writingCategories = [
    {
      id: "business",
      icon: <Briefcase className="h-4 w-4" />,
      title: "Business",
      prompts: [
        "Write a professional email to my boss about a project update",
        "Draft a compelling LinkedIn post about a recent achievement",
        "Create an executive summary for a quarterly business report",
        "Write a persuasive proposal for a new marketing campaign",
      ],
    },
    {
      id: "content",
      icon: <FileText className="h-4 w-4" />,
      title: "Content",
      prompts: [
        "Write a blog post about emerging trends in my industry",
        "Create engaging social media captions for a product launch",
        "Draft a newsletter that drives customer engagement",
        "Write compelling product descriptions that convert",
      ],
    },
    {
      id: "communication",
      icon: <MessageSquare className="h-4 w-4" />,
      title: "Communication",
      prompts: [
        "Rewrite this text to be more clear and concise",
        "Improve the tone of this message to sound more professional",
        "Create a presentation script that keeps audiences engaged",
        "Write customer service responses that build trust",
      ],
    },
    {
      id: "creative",
      icon: <Lightbulb className="h-4 w-4" />,
      title: "Creative",
      prompts: [
        "Brainstorm innovative solutions for a common problem",
        "Generate creative angles for a story or article",
        "Develop character backstories for creative writing",
        "Create compelling headlines that grab attention",
      ],
    },
  ];

  const handlePromptClick = (prompt: string) => {
    setInputText(prompt);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-background via-background to-muted/20">
      <div className="flex-1 flex items-center justify-center overflow-y-auto p-6">
        <div className="text-center max-w-3xl w-full">
          {/* Hero Section */}
          <div className="mb-6">
            <div className="relative inline-flex items-center justify-center w-16 h-16 mb-4">
              <div className="absolute inset-0 bg-primary/20 rounded-2xl animate-pulse"></div>
              <Bot className="h-8 w-8 text-primary relative z-10" />
              <Sparkles className="h-4 w-4 text-primary/60 absolute -top-1 -right-1" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Your AI Writing Partner
            </h1>
            <p className="text-sm text-muted-foreground mb-4">
              From first drafts to final edits, I'm here to help you write
              better, faster.
            </p>
          </div>

          {/* Writing Prompt Categories - Tabbed Interface */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              What would you like to write today?
            </h2>

            <Tabs defaultValue="business" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                {writingCategories.map((category) => (
                  <TabsTrigger
                    key={category.id}
                    value={category.id}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    {category.icon}
                    <span className="hidden sm:inline">{category.title}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {writingCategories.map((category) => (
                <TabsContent
                  key={category.id}
                  value={category.id}
                  className="mt-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {category.prompts.map((prompt, promptIndex) => (
                      <button
                        key={promptIndex}
                        onClick={() => handlePromptClick(prompt)}
                        className="p-3 text-left text-sm rounded-lg bg-muted/30 hover:bg-muted/50 transition-all duration-200 border border-muted/50 hover:border-muted group"
                      >
                        <span className="text-foreground group-hover:text-primary transition-colors">
                          {prompt}
                        </span>
                      </button>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t bg-background/95 backdrop-blur-sm">
        <div className="p-4">
          <ChatInput
            sendMessage={onNewChatMessage}
            placeholder="Describe what you'd like to write, or paste text to improve..."
            value={inputText}
            onValueChange={setInputText}
            className="!p-4"
            isGenerating={false}
            onStopGenerating={() => {}}
          />
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
            <span>Press Enter to send</span>
            <span>•</span>
            <span>Shift + Enter for new line</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const MessageListEmptyIndicator = () => (
  <div className="h-full flex items-center justify-center">
    <div className="text-center px-4">
      <div className="relative inline-flex items-center justify-center w-12 h-12 mb-4">
        <div className="absolute inset-0 bg-primary/10 rounded-xl"></div>
        <Bot className="h-6 w-6 text-primary/80 relative z-10" />
      </div>
      <h2 className="text-lg font-medium text-foreground mb-2">
        Ready to Write
      </h2>
      <p className="text-sm text-muted-foreground">
        Start the conversation and let's create something amazing together.
      </p>
    </div>
  </div>
);

const MessageListContent = () => {
  const { messages, thread, channel } = useChannelStateContext();
  const isThread = !!thread;
  const { aiState } = useAIState(channel);

  if (isThread) return null;

  const isThinking =
    aiState === "AI_STATE_THINKING" ||
    aiState === "AI_STATE_GENERATING" ||
    aiState === "AI_STATE_EXTERNAL_SOURCES";

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {!messages?.length ? (
        <MessageListEmptyIndicator />
      ) : (
        <>
          <MessageList Message={ChatMessage} />
          {isThinking && (
            <div className="px-4 py-2 text-xs text-muted-foreground flex items-center gap-2">
              <span>🤔 AI is thinking...</span>
              <div className="flex space-x-1">
                <span className="w-1 h-1 bg-current rounded-full animate-pulse" />
                <span className="w-1 h-1 bg-current rounded-full animate-pulse [animation-delay:150ms]" />
                <span className="w-1 h-1 bg-current rounded-full animate-pulse [animation-delay:300ms]" />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onToggleSidebar,
  onNewChatMessage,
  backendUrl,
}) => {
  const { channel } = useChatContext();
  const { selectedModel } = useModel();
  const agentStatus = useAIAgentStatus({
    channelId: channel?.id ?? null,
    backendUrl,
  });

  const ChannelMessageInputComponent = () => {
    const { sendMessage } = useChannelActionContext();
    const { channel, messages } = useChannelStateContext();
    const { aiState } = useAIState(channel);
    const { selectedModel } = useModel();
    const [inputText, setInputText] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const isGenerating =
      aiState === "AI_STATE_THINKING" ||
      aiState === "AI_STATE_GENERATING" ||
      aiState === "AI_STATE_EXTERNAL_SOURCES";

    console.log("aiState", aiState);

    const handleStopGenerating = () => {
      if (channel) {
        const aiMessage = [...messages]
          .reverse()
          .find((m) => m.user?.id.startsWith("ai-bot"));
        if (aiMessage) {
          channel.sendEvent({
            type: "ai_indicator.stop",
            cid: channel.cid,
            message_id: aiMessage.id,
          });
        }
      }
    };

    const handleSendMessage = async (message: { text: string }) => {
      // Include the selected model in the message custom field
      await sendMessage({
        ...message,
        custom: {
          model: selectedModel,
        },
      });
    };

    return (
      <ChatInput
        sendMessage={handleSendMessage}
        value={inputText}
        onValueChange={setInputText}
        textareaRef={textareaRef}
        showPromptToolbar={true}
        className="!p-4"
        isGenerating={isGenerating}
        onStopGenerating={handleStopGenerating}
      />
    );
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Enhanced Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="lg:hidden h-9 w-9"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
              {channel?.id && agentStatus.status === "connected" && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
              )}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {channel?.data?.name || "New Writing Session"}
              </h2>
              <p className="text-xs text-muted-foreground">
                AI Writing Assistant • {selectedModel || "Default Model"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ModelSelector />
          <MetricsDialog backendUrl={backendUrl} />
          {channel?.id && (
            <AIAgentControl
              status={agentStatus.status}
              loading={agentStatus.loading}
              error={agentStatus.error}
              toggleAgent={agentStatus.toggleAgent}
              checkStatus={agentStatus.checkStatus}
              channelId={channel.id}
            />
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {!channel ? (
          <EmptyStateWithInput onNewChatMessage={onNewChatMessage} />
        ) : (
          <Channel channel={channel}>
            <Window>
              <MessageListContent />
              <ChannelMessageInputComponent />
            </Window>
          </Channel>
        )}
      </div>
    </div>
  );
};

const MetricsDialog: React.FC<{ backendUrl: string }> = ({ backendUrl }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    totalRequests: number;
    avgLatency: number;
    totalTokens: number;
    totalCostUSD: number;
    requestsByModel: Record<string, number>;
  } | null>(null);

  const fetchMetrics = async () => {
    if (!backendUrl) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${backendUrl}/metrics`);
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) fetchMetrics(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2">
          <BarChart2 className="h-3 w-3" />
          <span>Stats</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aggregate Metrics</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : error ? (
          <div className="text-sm text-red-500">Error: {error}</div>
        ) : data ? (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span>Total requests</span><span>{data.totalRequests}</span></div>
            <div className="flex justify-between"><span>Avg latency</span><span>{data.avgLatency} ms</span></div>
            <div className="flex justify-between"><span>Total tokens</span><span>{data.totalTokens}</span></div>
            <div className="flex justify-between"><span>Total cost</span><span>${(data.totalCostUSD ?? 0).toFixed(4)}</span></div>
            <div>
              <div className="font-medium mb-1">Requests by model</div>
              <div className="grid grid-cols-1 gap-1">
                {Object.entries(data.requestsByModel || {}).map(([model, count]) => (
                  <div key={model} className="flex justify-between"><span>{model}</span><span>{count}</span></div>
                ))}
                {Object.keys(data.requestsByModel || {}).length === 0 && (
                  <div className="text-muted-foreground">No data yet</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No data</div>
        )}
      </DialogContent>
    </Dialog>
  );
};
