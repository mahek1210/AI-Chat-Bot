import { useAIAgentStatus } from "@/hooks/use-ai-agent-status";
import { useModel } from "@/contexts/model-context";
import { useProfile } from "@/contexts/profile-context";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfileSelectorDialog } from "@/components/profile-selector-dialog";
import {
  Bot,
  Briefcase,
  FileText,
  Lightbulb,
  Menu,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import { ModelSelector, MODEL_OPTIONS } from "./model-selector";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { BarChart2 } from "lucide-react";
import { ConnectionStatusBanner, ConnectionStatusDot } from "./connection-status-banner";
import { useConnectionStatus } from "@/contexts/connection-context";
import { PricingChartDialog } from "./pricing-chart";


interface ChatInterfaceProps {
  onToggleSidebar: () => void;
  onNewChatMessage: (message: { text: string }) => Promise<void>;
  backendUrl: string;
}

// Persona-specific starter prompt tabs
const PERSONA_PROMPTS: Record<string, { id: string; icon: React.ReactNode; title: string; prompts: string[] }[]> = {
  writing_coach: [
    { id: 'business', icon: <Briefcase className="h-4 w-4" />, title: 'Business', prompts: ['Write a professional email to my boss about a project update', 'Draft a compelling LinkedIn post about a recent achievement', 'Create an executive summary for a quarterly business report', 'Write a persuasive proposal for a new marketing campaign'] },
    { id: 'content', icon: <FileText className="h-4 w-4" />, title: 'Content', prompts: ['Write a blog post about emerging trends in my industry', 'Create engaging social media captions for a product launch', 'Draft a newsletter that drives customer engagement', 'Write compelling product descriptions that convert'] },
    { id: 'communication', icon: <MessageSquare className="h-4 w-4" />, title: 'Improve', prompts: ['Rewrite this text to be more clear and concise', 'Improve the tone of this message to sound more professional', 'Create a presentation script that keeps audiences engaged', 'Write customer service responses that build trust'] },
    { id: 'creative', icon: <Lightbulb className="h-4 w-4" />, title: 'Creative', prompts: ['Brainstorm innovative solutions for a common problem', 'Generate creative angles for a story or article', 'Develop character backstories for creative writing', 'Create compelling headlines that grab attention'] },
  ],
  comedian: [
    { id: 'roast', icon: <span>🔥</span>, title: 'Roast Me', prompts: ['Roast me based on the fact that I wake up at 6am every day', 'Give me 5 jokes about working from home and having no social life', 'Write a stand-up comedy bit about smartphones making everyone dumb', 'Roast whoever invented Mondays'] },
    { id: 'memes', icon: <span>😂</span>, title: 'Memes', prompts: ['Give me 5 meme formats for when your code works on the first try', 'Create a meme about adulting being basically just googling stuff', 'Make a meme about people who say "we should hang out" but never do', 'Generate a top-tier meme format about exam season'] },
    { id: 'puns', icon: <span>🎭</span>, title: 'Puns & Jokes', prompts: ['Give me 10 terrible puns about food that I can use at dinner', 'Write a dad joke so bad it loops back around to being good', 'Create 5 knock-knock jokes about technology', 'Make a punny poem about coffee'] },
    { id: 'situations', icon: <span>🤣</span>, title: 'Situations', prompts: ['Write a funny take on why my gym membership is basically a donation', 'Explain quantum physics like a stand-up comedian', 'Describe a Monday morning meeting in the most dramatic way possible', 'Turn a passive-aggressive email into pure comedy gold'] },
  ],
  spiritual_guide: [
    { id: 'mindfulness', icon: <span>🧘</span>, title: 'Mindfulness', prompts: ['Guide me through a 5-minute breathing meditation for stress relief', 'What does Buddhism say about letting go of things we cannot control?', 'Help me find gratitude even when everything feels overwhelming', 'How can I practice mindfulness throughout a busy workday?'] },
    { id: 'wisdom', icon: <span>📿</span>, title: 'Wisdom', prompts: ['What does the Bhagavad Gita say about handling failure?', 'Share a Stoic perspective on dealing with uncertainty in life', 'How do I find my life purpose according to spiritual traditions?', 'What does the concept of karma truly mean in daily life?'] },
    { id: 'healing', icon: <span>🌱</span>, title: 'Healing', prompts: ['Help me process feeling stuck and purposeless in my current life', 'Guide me through releasing resentment towards someone who hurt me', 'What spiritual practice helps with anxiety and overthinking?', 'How do I find peace when everything around me feels chaotic?'] },
    { id: 'quotes', icon: <span>✨</span>, title: 'Inspiration', prompts: ['Give me 5 powerful quotes that can change my perspective on adversity', 'Share a morning spiritual reflection to start the day with intention', 'What would Rumi say about the pain of missing someone you love?', 'Find me a quote that captures the beauty of impermanence'] },
  ],
  historian: [
    { id: 'ancient', icon: <span>🏛️</span>, title: 'Ancient', prompts: ['Tell me the story of the fall of the Roman Empire in vivid detail', 'What was daily life like for a commoner in ancient Egypt?', 'Explain the greatness of the Gupta Empire and why it ended', 'How did the Silk Road change the ancient world?'] },
    { id: 'modern', icon: <span>📰</span>, title: 'Modern', prompts: ['What really caused World War I — explain the chain of events?', 'How did the Cold War shape the world we live in today?', 'Tell me about the partition of India in 1947 and its impact', 'Explain the rise and fall of Hitler in historical context'] },
    { id: 'people', icon: <span>👑</span>, title: 'Great Figures', prompts: ['Who was Chandragupta Maurya and how did he build his empire?', 'What made Genghis Khan the most devastating conqueror in history?', 'Tell me about Cleopatra — the real story, not the myths', 'What was Napoleon like as a person, beyond the battlefield?'] },
    { id: 'forgotten', icon: <span>🗺️</span>, title: 'Forgotten', prompts: ['Tell me about a major civilization that most people have never heard of', 'What fascinating inventions did the ancient world create that we forgot?', 'Share a little-known historical event that changed everything', 'Which empire was more powerful — Mongol, Roman, or British?'] },
  ],
  scientist: [
    { id: 'physics', icon: <span>⚛️</span>, title: 'Physics', prompts: ['Explain quantum entanglement like I am a curious 15-year-old', 'How does a black hole actually work, and can anything escape?', 'What is dark matter and why do scientists think it exists?', 'Explain the Theory of Relativity with a real-world example'] },
    { id: 'biology', icon: <span>🧬</span>, title: 'Biology', prompts: ['How does CRISPR gene editing work and what are its ethical risks?', 'Explain how the human brain stores and retrieves memories', 'What happens to the human body when it experiences extreme stress?', 'How does the immune system know what is foreign and what is self?'] },
    { id: 'tech', icon: <span>🤖</span>, title: 'Technology', prompts: ['How does a large language model like you actually work?', 'Explain how fusion energy could solve the world energy crisis', 'What is quantum computing and when will it be practical?', 'How does the internet physically work from click to screen?'] },
    { id: 'cosmos', icon: <span>🌌</span>, title: 'Cosmos', prompts: ['Are we alone in the universe? What does the science actually say?', 'Explain the Big Bang — what happened in the first second?', 'How did the first stars form and where did they come from?', 'What is the Fermi Paradox and what are the best proposed solutions?'] },
  ],
  time_traveler: [
    { id: 'future', icon: <span>🔮</span>, title: 'The Future', prompts: ['Tell me something shocking about Earth in 2147 without spoiling too much', 'What was the biggest invention between 2025 and 2100?', 'Did humanity ever achieve interstellar travel? How?', 'Will humans and AI eventually merge? What does that look like?'] },
    { id: 'past', icon: <span>⌛</span>, title: 'The Past', prompts: ['From your future perspective, what did historians get wrong about 2025?', 'What was the most underrated decade in human history according to your era?', 'Which historical leader turned out to be far more important than people thought?', 'Did any ancient civilization have technology that was later rediscovered?'] },
    { id: 'paradox', icon: <span>🌀</span>, title: 'Paradoxes', prompts: ['Explain the grandfather paradox and how time travelers deal with it', 'Has anyone ever accidentally changed history by time traveling?', 'What is the Novikov self-consistency principle in layman terms?', 'If I went back to 1900 with a smartphone, what would happen?'] },
    { id: 'life', icon: <span>🚀</span>, title: 'Future Life', prompts: ['What does a typical Tuesday look like in 2147?', 'Do people in the future still eat food, or have things changed?', 'Is money still a thing in the future? What replaced it?', 'What do future humans think about us 21st-century people?'] },
  ],
  movie_critic: [
    { id: 'reviews', icon: <span>⭐</span>, title: 'Reviews', prompts: ['Review Christopher Nolan\'s Oppenheimer in your most dramatic style', 'Give me a scathing review of the worst film ever made', 'Review the original Star Wars trilogy as if it just released in 2025', 'What is your definitive take on the Marvel Cinematic Universe as a whole?'] },
    { id: 'debate', icon: <span>🍿</span>, title: 'Debate', prompts: ['Who is the greatest director of all time — defend your answer', 'Defend a highly controversial movie that most people hate', 'Is The Dark Knight overrated, or is it truly the best superhero film?', 'Which ending is better: Inception\'s or The Shawshank Redemption\'s?'] },
    { id: 'recs', icon: <span>🎬</span>, title: 'Recommendations', prompts: ['Recommend 5 underrated world cinema films that will change my life', 'What are the best psychological thrillers of the last decade?', 'Give me 5 films that are better than their IMDb rating suggests', 'What should I watch if I loved Parasite and No Country for Old Men?'] },
    { id: 'analysis', icon: <span>🖥️</span>, title: 'Analysis', prompts: ['Analyze the cinematography and symbolism in Kubrick\'s 2001: A Space Odyssey', 'What is the hidden meaning of the ending in Inception?', 'Explain the three-act structure using Avengers Endgame as an example', 'What makes Quentin Tarantino\'s dialogue style so distinctive?'] },
  ],
  cricket_fanatic: [
    { id: 'match', icon: <span>🏏</span>, title: 'Match Analysis', prompts: ['Analyze Virat Kohli\'s Test career at its absolute peak', 'What was the greatest Test match ever played and why?', 'Break down the tactics India used to win the 2011 World Cup', 'Explain why the Ashes series is the most intense rivalry in cricket'] },
    { id: 'goat', icon: <span>🐐</span>, title: 'GOAT Debates', prompts: ['Is Sachin Tendulkar or Virat Kohli the better batter — settle this once and for all', 'Rank the 5 greatest fast bowlers in cricket history with reasoning', 'Who had the greater career: MS Dhoni or Ricky Ponting?', 'Which is the greatest cricket team of all time by era?'] },
    { id: 'ipl', icon: <span>💜</span>, title: 'IPL & T20', prompts: ['Analyse what makes Mumbai Indians so consistently dominant in the IPL', 'Who are the 5 greatest IPL players of all time?', 'How has T20 cricket changed the way young batters approach the game?', 'Which franchise has done the best squad-building in IPL history?'] },
    { id: 'history', icon: <span>📜</span>, title: 'Great Moments', prompts: ['Relive the 2011 World Cup final — ball by ball if possible', 'Tell me about the greatest comeback in Test cricket history', 'Describe the 2002 India-England Headingley Test match in dramatic detail', 'What are the most iconic bowling spells in cricket history?'] },
  ],
  football_fanatic: [
    { id: 'analysis', icon: <span>⚽</span>, title: 'Match Analysis', prompts: ['Analyze how Manchester City\'s high press under Guardiola dismantles defenses', 'What tactics made Liverpool so dominant under Klopp?', 'Break down the greatest Champions League final you\'ve ever seen', 'How does Rodri\'s positioning influence Manchester City\'s entire system?'] },
    { id: 'goat', icon: <span>🐐</span>, title: 'Messi vs Ronaldo', prompts: ['Settle the Messi vs Ronaldo debate once and for all', 'Who is the greatest Premier League player of all time?', 'Rank the top 10 footballers of the 21st century with reasoning', 'Was Zinedine Zidane the most complete footballer ever?'] },
    { id: 'tactics', icon: <span>📋</span>, title: 'Tactics', prompts: ['Explain the difference between a false 9 and a traditional centre-forward', 'How does high gegenpressing work and which teams do it best?', 'What is tiki-taka and why did Barcelona\'s version dominate the world?', 'Explain why the 4-3-3 is still the most versatile formation in football'] },
    { id: 'history', icon: <span>🏆</span>, title: 'Greatest Moments', prompts: ['Relive the greatest World Cup final in football history', 'Tell me about the greatest comeback in Champions League history', 'Who were the greatest national teams of all time across all eras?', 'Describe the magic of the 1970 Brazil team — the most beautiful football ever'] },
  ],
  lord_krishna: [
    { id: 'gita', icon: <span>📿</span>, title: 'Bhagavad Gita', prompts: ['Teach me the core message of the Bhagavad Gita in modern terms', 'What does Chapter 2 of the Gita say about the nature of the soul?', 'Explain the concept of Nishkama Karma — action without attachment', 'What does the Gita say about the three gunas and how they shape our nature?'] },
    { id: 'guidance', icon: <span>🦚</span>, title: 'Life Guidance', prompts: ['Lord Krishna, how do I find my dharma in life?', 'What would you say to someone who feels completely lost and purposeless?', 'How does one overcome ego according to the teachings of the Gita?', 'What is the path to inner peace when the mind is constantly restless?'] },
    { id: 'stories', icon: <span>🌸</span>, title: 'Stories', prompts: ['Tell me the story of the Mahabharata battlefield before the Gita was spoken', 'Share the story of Krishna and Sudama — the power of true friendship', 'What is the lesson from the story of Arjuna and the bird\'s eye?', 'Tell me about Krishna\'s childhood in Vrindavan and what it teaches us'] },
    { id: 'philosophy', icon: <span>🕉️</span>, title: 'Philosophy', prompts: ['What is the difference between the atman and Brahman?', 'Explain the concept of Maya — the illusion of the material world', 'What is bhakti yoga and how does devotion lead to liberation?', 'How does one practice equanimity in the face of loss and suffering?'] },
  ],
  lord_ram: [
    { id: 'ramayana', icon: <span>🏹</span>, title: 'Ramayana', prompts: ['Tell me the story of Ram\'s exile and what dharma it teaches us', 'What is the lesson from the Valmiki Ramayana\'s Kishkindha Kanda?', 'Describe the battle of Lanka — what made Ram\'s army so formidable spiritually?', 'Why is Ram considered the ideal son, husband, king, and friend?'] },
    { id: 'guidance', icon: <span>🌺</span>, title: 'Guidance', prompts: ['Lord Ram, how do I keep my word when breaking it would be easier?', 'How does one practice dharma when the righteous path is painful?', 'What would you say to someone who feels abandoned and alone?', 'How do I forgive someone who betrayed my trust completely?'] },
    { id: 'values', icon: <span>🪔</span>, title: 'Values', prompts: ['What does Satya (truth) mean in practical everyday life?', 'How can I be a better son/daughter — what does the Ramayana teach?', 'What is the quality that made Hanuman\'s devotion to Ram so perfect?', 'How do I lead with service and humility like Ram led as king of Ayodhya?'] },
    { id: 'stories', icon: <span>📖</span>, title: 'Teachings', prompts: ['What can we learn from Kaikeyi\'s boon and Ram\'s response to it?', 'What is the lesson from Ram\'s treatment of Shabari the devotee?', 'Why did Ram build a bridge to Lanka when he could have used divine power?', 'What made Lakshman\'s dedication to his brother Ram so extraordinary?'] },
  ],
  life_coach: [
    { id: 'goals', icon: <span>🎯</span>, title: 'Goals', prompts: ['Help me design a 90-day plan to change my career direction', 'How do I set SMART goals that I will actually follow through on?', 'What is the best system for building good habits and breaking bad ones?', 'How do I stop procrastinating on the one thing that matters most?'] },
    { id: 'mindset', icon: <span>💪</span>, title: 'Mindset', prompts: ['Help me reframe my limiting belief that I am not smart enough to succeed', 'What is a growth mindset and how do I actually build one?', 'How do I stop comparing myself to others on social media?', 'Challenge the story I am telling myself about why I cannot change'] },
    { id: 'relationships', icon: <span>❤️</span>, title: 'Relationships', prompts: ['How do I have a difficult conversation with someone I care about?', 'What are the signs of a toxic relationship and how do I exit one?', 'How do I build deeper, more meaningful friendships as an adult?', 'How do I set healthy boundaries without feeling guilty?'] },
    { id: 'performance', icon: <span>🚀</span>, title: 'Performance', prompts: ['Design a morning routine that will make me 10x more productive', 'How do high performers manage their energy, not just their time?', 'What mental techniques do elite athletes use that I can apply to work?', 'How do I manage deep work when constant distractions steal my focus?'] },
  ],
  dev_mentor: [
    { id: 'review', icon: <span>👨‍💻</span>, title: 'Code Review', prompts: ['Review my React code and suggest production-ready improvements', 'What are the most common mistakes junior developers make in Node.js?', 'How should I structure a REST API for a large-scale application?', 'Review my database schema design and suggest optimizations'] },
    { id: 'concepts', icon: <span>📚</span>, title: 'Concepts', prompts: ['Explain Big O notation with practical examples I can visualize', 'What is the difference between SQL and NoSQL — when to use each?', 'Teach me what closures in JavaScript are with a real-world analogy', 'Explain the SOLID principles with concrete code examples'] },
    { id: 'debug', icon: <span>🐛</span>, title: 'Debugging', prompts: ['Help me approach debugging a race condition in async JavaScript', 'My API is slow — walk me through a systematic performance investigation', 'Explain how to use Chrome DevTools for memory leak detection', 'How do I debug a production issue with minimal information?'] },
    { id: 'career', icon: <span>🏆</span>, title: 'Career', prompts: ['How do I get my first software engineering job with no experience?', 'What should I build for my portfolio to impress senior engineers?', 'How do senior engineers communicate differently from junior ones?', 'What is the fastest path from junior to senior engineer?'] },
  ],
  debate_champion: [
    { id: 'argue', icon: <span>🗣️</span>, title: 'Argue Both Sides', prompts: ['Argue both sides of whether AI will help or destroy humanity', 'Steel-man the argument that social media does more good than harm', 'Present the strongest case for and against universal basic income', 'Argue both sides of whether remote work is better than office work'] },
    { id: 'controversial', icon: <span>🔥</span>, title: 'Hot Takes', prompts: ['Is democracy truly the best system of governance? Challenge my assumptions', 'Should wealth beyond a billion dollars be taxed at 99%? Debate me', 'Is cancel culture harmful or is it just accountability? Argue both ways', 'Are zoos ethical or should they all be abolished?'] },
    { id: 'fallacies', icon: <span>🧩</span>, title: 'Logic', prompts: ['Identify every logical fallacy in this argument: [paste your argument]', 'Teach me the 10 most common logical fallacies with examples from real life', 'Use Bayesian reasoning to analyze whether I should change careers', 'Apply Occam\'s Razor to a problem I am overthinking'] },
    { id: 'philosophy', icon: <span>🦉</span>, title: 'Philosophy', prompts: ['Debate the trolley problem — would you pull the lever?', 'Is free will real or just an illusion we tell ourselves?', 'Does the end justify the means? Argue with examples from history', 'Apply Stoic philosophy to the modern problem of constant digital distraction'] },
  ],
};

const DEFAULT_PROMPTS = PERSONA_PROMPTS['writing_coach'];

// Helper: convert a custom persona's CustomPromptTab array into the same
// shape as PERSONA_PROMPTS entries so the same rendering code works.
function toPromptTabShape(
  tabs: import('@/data/ai-profiles').CustomPromptTab[]
): { id: string; icon: React.ReactNode; title: string; prompts: string[] }[] {
  return tabs.map(t => ({ id: t.id, icon: <span>{t.icon}</span>, title: t.title, prompts: t.prompts }));
}

const EmptyStateWithInput: React.FC<{
  onNewChatMessage: ChatInputProps["sendMessage"];
  isConnected?: boolean;
  onConnect?: () => void;
}> = ({ onNewChatMessage, isConnected = true, onConnect }) => {
  const [inputText, setInputText] = useState("");
  const { activeProfile } = useProfile();

  const writingCategories =
    PERSONA_PROMPTS[activeProfile.id] ??
    (activeProfile.customPrompts ? toPromptTabShape(activeProfile.customPrompts) : DEFAULT_PROMPTS);

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
              <span className="text-3xl relative z-10">{activeProfile.emoji}</span>
              <Sparkles className="h-4 w-4 text-primary/60 absolute -top-1 -right-1" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {activeProfile.name}
            </h1>
            <p className="text-sm text-muted-foreground mb-4">
              {activeProfile.tagline}
            </p>
          </div>

          {/* Persona-specific prompt tabs */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              What would you like to explore today?
            </h2>

            <Tabs defaultValue={writingCategories[0]?.id} className="w-full">
              <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${writingCategories.length}, 1fr)` }}>
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
            placeholder={`Ask ${activeProfile.name} anything...`}
            value={inputText}
            onValueChange={setInputText}
            className="!p-4"
            isGenerating={false}
            onStopGenerating={() => {}}
            isConnected={isConnected}
            onConnect={onConnect}
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
  const { isConnected, reconnect } = useConnectionStatus();
  const { activeProfile, isPersonaDeleted } = useProfile();
  const [profileSelectorOpen, setProfileSelectorOpen] = useState(false);
  const agentStatus = useAIAgentStatus({
    channelId: channel?.id ?? null,
    backendUrl,
  });

  // Detect if this session's persona was deleted by its owner
  const channelData = channel?.data as any;
  const sessionProfileId: string | undefined = channelData?.profileId;
  const sessionProfileName: string = channelData?.profileName || activeProfile.name;
  const sessionProfileEmoji: string = channelData?.profileEmoji || activeProfile.emoji;
  const isSessionPersonaDeleted = channel && sessionProfileId ? isPersonaDeleted(sessionProfileId) : false;

  // (Emoji trail effect removed as per strict persona isolation)

  // Handle model changes automatically when agent is connected
  const handleModelChange = async (newModel: string) => {
    if (agentStatus.status === "connected" && agentStatus.updateAgentModel) {
      await agentStatus.updateAgentModel(newModel);
    }
  };

  const ChannelMessageInputComponent = () => {
    const { sendMessage } = useChannelActionContext();
    const { channel, messages } = useChannelStateContext();
    const { aiState } = useAIState(channel);
    const { selectedModel } = useModel();
    const { isConnected, reconnect } = useConnectionStatus();
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
      console.log("Selected model in frontend:", selectedModel);
      await sendMessage({
        ...message,
        custom: {
          model: selectedModel,
        },
      } as any);
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
        isConnected={isConnected}
        onConnect={reconnect}
      />
    );
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Profile Selector Dialog */}
      <ProfileSelectorDialog open={profileSelectorOpen} onOpenChange={setProfileSelectorOpen} />

      {/* Enhanced Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="h-9 w-9 shrink-0"
            title="Toggle Sidebar"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
              {channel?.id && (
                <ConnectionStatusDot className="absolute -top-1 -right-1" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-foreground truncate">
                {channel?.data?.name || `New ${sessionProfileName} Session`}
              </h2>
              <p className={cn(
                "text-xs flex items-center gap-1 overflow-hidden",
                isSessionPersonaDeleted
                  ? "text-amber-500/80"
                  : "text-muted-foreground"
              )}>
                {isSessionPersonaDeleted ? (
                  <span className="flex items-center gap-1 overflow-hidden">
                    <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                    <span className="line-through opacity-60 truncate">{sessionProfileEmoji} {sessionProfileName}</span>
                    <span className="ml-1 not-italic flex-shrink-0">• Persona removed</span>
                  </span>
                ) : (
                  <>
                    <span className="flex-shrink-0">{sessionProfileEmoji}</span>
                    <span className="truncate max-w-[100px] sm:max-w-none">{sessionProfileName}</span>
                    <span className="flex-shrink-0 text-muted-foreground/50">•</span>
                    <span className="truncate">{(MODEL_OPTIONS.find(opt => opt.value === (channelData?.model || selectedModel))?.label) || channelData?.model || selectedModel || "Default Model"}</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Profile selector button */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-2 text-xs font-medium"
            onClick={() => setProfileSelectorOpen(true)}
            title="Change AI Persona"
          >
            <span className="text-base leading-none">{activeProfile.emoji}</span>
            <span className="hidden sm:inline max-w-[80px] truncate">{activeProfile.name}</span>
          </Button>
          <ModelSelector 
            onModelChange={handleModelChange} 
            loading={agentStatus.loading}
          />
          <PricingChartDialog />
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

      {/* Connection Status Banner – auto-shown when not connected */}
      <ConnectionStatusBanner />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {!channel ? (
          <EmptyStateWithInput onNewChatMessage={onNewChatMessage} isConnected={isConnected} onConnect={reconnect} />
        ) : (
          <Channel channel={channel}>
            <Window>
              <MessageListContent />
              {isSessionPersonaDeleted ? (
                // Persona was deleted — block new messages, show warning
                <div className="border-t bg-amber-500/5 border-amber-500/20 px-4 py-3 flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                      This persona has been removed
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Chat history is preserved, but new messages cannot be sent. Select a different persona to continue chatting.
                    </p>
                  </div>
                </div>
              ) : (
                <ChannelMessageInputComponent />
              )}
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
