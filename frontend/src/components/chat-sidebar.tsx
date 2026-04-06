import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  LogOut,
  MessageSquare,
  Moon,
  PlusCircle,
  Sun,
  Trash2,
  UserX,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Channel, ChannelFilters, ChannelSort } from "stream-chat";
import { ChannelList, useChatContext } from "stream-chat-react";
import { useTheme } from "../hooks/use-theme";
import { useProfile } from "@/contexts/profile-context";

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onNewChat: () => void;
  onChannelDelete: (channel: Channel) => void;
  onDeleteAccount: () => void;
}

// Persona-specific empty state copy
const PROFILE_EMPTY_STATES: Record<string, { title: string; subtitle: string; hint: string }> = {
  writing_coach: { title: 'No writing sessions yet', subtitle: 'Start a writing session to create content, improve documents, or brainstorm ideas.', hint: '↓ Click "New Session" to begin writing' },
  comedian: { title: 'No roast sessions yet 😭', subtitle: 'Start a session to get roasted, generate memes, or just vibe with your AI comedian.', hint: '↓ No cap, click New Session to slay fr fr' },
  spiritual_guide: { title: 'Your journey begins here 🙏', subtitle: 'Open a session to explore mindfulness, find inner peace, and receive spiritual guidance.', hint: '↓ Click New Session to start your practice' },
  historian: { title: 'No history sessions yet 📜', subtitle: 'Open a session to explore the past, discuss civilizations, or uncover forgotten stories.', hint: '↓ Click New Session to discover history' },
  scientist: { title: 'No science sessions yet 🔬', subtitle: 'Start a session to explore discoveries, explain phenomena, or dive deep into research.', hint: '↓ Click New Session to begin exploring' },
  time_traveler: { title: 'No time-travel logs yet ⏳', subtitle: 'Begin a session to hear about the future, past paradoxes, and chrono-greetings.', hint: '↓ Click New Session to warp through time' },
  movie_critic: { title: 'No cinema sessions yet 🎬', subtitle: 'Open a session to discuss films, get reviews, or debate the greatest movies ever made.', hint: '↓ Lights, camera — start a new session!' },
  cricket_fanatic: { title: 'No cricket sessions yet 🏏', subtitle: 'Start a session to discuss match analysis, player stats, or relive iconic innings.', hint: '↓ Play a straight drive — start a session!' },
  football_fanatic: { title: 'No football sessions yet ⚽', subtitle: 'Start a session to discuss tactics, transfer news, or debate the greatest players.', hint: '↓ Kick off — start a new session!' },
  lord_krishna: { title: 'Begin your dharma journey 🦚', subtitle: 'Open a session to receive wisdom from the Bhagavad Gita and eternal teachings.', hint: '↓ O seeker, begin your session' },
  lord_ram: { title: 'Walk the righteous path 🏹', subtitle: 'Open a session to discuss duty, virtue, and the timeless values of the Ramayana.', hint: '↓ The path awaits — start a session' },
  life_coach: { title: 'No coaching sessions yet 🎯', subtitle: 'Start a session to set goals, break limiting beliefs, and unlock your best self.', hint: '↓ Click New Session to level up your life' },
  dev_mentor: { title: 'No dev sessions yet 💻', subtitle: 'Open a session to get code reviewed, explain concepts, or debug with your senior mentor.', hint: 'git commit -m "start new session"' },
  debate_champion: { title: 'No debate sessions yet 🗣️', subtitle: 'Begin a session to argue ideas, explore multiple perspectives, and sharpen your thinking.', hint: '↓ Click New Session — take a position!' },
};

// Category labels for sidebar header
const CATEGORY_LABELS: Record<string, string> = {
  Professional: '💼 Professional Sessions',
  Fun: '🎉 Fun Sessions',
  Knowledge: '🧠 Knowledge Sessions',
  Spiritual: '🕉️ Spiritual Sessions',
  Entertainment: '🎬 Entertainment Sessions',
  Sports: '🏆 Sports Sessions',
  Custom: '✨ Custom Sessions',
};

export const ChatSidebar = ({
  isOpen,
  onClose,
  onLogout,
  onNewChat,
  onChannelDelete,
  onDeleteAccount,
}: ChatSidebarProps) => {
  const { client, setActiveChannel } = useChatContext();
  const { user } = client;
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { activeProfile } = useProfile();

  if (!user) return null;

  const emptyState = PROFILE_EMPTY_STATES[activeProfile.id] || {
    title: `No ${activeProfile.name} sessions yet`,
    subtitle: `Start a new session to chat with ${activeProfile.emoji} ${activeProfile.name}.`,
    hint: '↓ Click New Session to begin',
  };

  // Filter by EXACT PERSONA ID — strict isolation
  const filters: ChannelFilters = {
    type: "messaging",
    members: { $in: [user.id] },
    profileId: { $eq: activeProfile.id } as any,
  };
  const sort: ChannelSort = { last_message_at: -1 };
  const options = { state: true, presence: true, limit: 30 };

  const categoryLabel = `${activeProfile.emoji} ${activeProfile.name} Sessions`;

  const ChannelListEmptyStateIndicator = () => (
    <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
      <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-transparent rounded-2xl flex items-center justify-center shadow-sm border border-primary/10 mb-4">
        <span className="text-2xl">{activeProfile.emoji}</span>
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{emptyState.title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed mb-3">{emptyState.subtitle}</p>
      <span className="text-[10px] text-muted-foreground/50">{emptyState.hint}</span>
    </div>
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={onClose} />
      )}

      <div className={cn(
        "fixed inset-y-0 left-0 z-50 bg-background border-r flex flex-col transform transition-transform duration-300 ease-in-out w-80",
        isOpen ? "translate-x-0" : "-translate-x-full",
        // Desktop overrides to let the parent Panel control the width
        "lg:static lg:transform-none lg:w-full lg:h-full lg:translate-x-0"
      )}>
        {/* Sidebar Header — shows category label */}
        <div className="p-4 border-b flex justify-between items-start min-w-0">
          <div className="flex-1 min-w-0 pr-2">
            <h2 className="text-sm font-bold text-foreground leading-tight truncate">{categoryLabel}</h2>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight truncate">
              {activeProfile.emoji} {activeProfile.name} · {activeProfile.tagline}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden h-8 w-8 shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Channel List */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-0">
            <ChannelList
              filters={filters}
              sort={sort}
              options={options}
              setActiveChannelOnMount={false}
              EmptyStateIndicator={ChannelListEmptyStateIndicator}
              Preview={(previewProps) => {
                const channelData = previewProps.channel.data as any;
                const isActiveInThisChannel = channelData?.profileId === activeProfile.id;

                return (
                  <div
                    className={cn(
                      "flex items-center px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 relative group mb-1 border",
                      previewProps.active
                        ? "bg-primary/15 border-primary/30 shadow-sm"
                        : "hover:bg-muted/40 border-transparent hover:border-muted/30"
                    )}
                    onClick={() => {
                      setActiveChannel(previewProps.channel);
                      navigate(`/chat/${previewProps.channel.id}`);
                      onClose();
                    }}
                  >
                    {/* Left: session name */}
                    <MessageSquare className={cn("h-3.5 w-3.5 mr-2 shrink-0 transition-colors", previewProps.active ? "text-primary" : "text-muted-foreground/50")} />
                    <span className="flex-1 truncate text-sm font-medium text-foreground">
                      {previewProps.channel.data?.name || `New ${activeProfile.name} Session`}
                    </span>

                    {/* Delete button on hover */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10 ml-1"
                      onClick={async (e) => {
                        e.stopPropagation();
                        onChannelDelete(previewProps.channel);
                      }}
                      title="Delete session"
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground/60 hover:text-destructive" />
                    </Button>
                  </div>
                );
              }}
            />
          </div>
        </ScrollArea>

        {/* New Session Button */}
        <div className="p-3 border-t bg-background/50 backdrop-blur-md">
          <Button 
            onClick={onNewChat} 
            className="w-full justify-start group relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(var(--primary),0.2)] active:scale-[0.98]"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            <span>New {activeProfile.name} Session</span>
            <span className="ml-auto text-base opacity-70 group-hover:opacity-100 transition-opacity">
              {activeProfile.emoji}
            </span>
          </Button>
        </div>

        {/* User footer */}
        <div className="p-2 border-t bg-background">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start items-center p-2 h-auto">
                <Avatar className="w-8 h-8 mr-2">
                  <AvatarImage src={user?.image} alt={user?.name} />
                  <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-sm truncate">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">Online</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72" align="end">
              <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                <span>Switch to {theme === "dark" ? "Light" : "Dark"} Theme</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDeleteAccount}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                <UserX className="mr-2 h-4 w-4" />
                <span>Delete Account</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );
};
