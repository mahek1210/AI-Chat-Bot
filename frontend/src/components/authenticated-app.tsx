import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Channel, ChannelFilters, ChannelSort, User } from "stream-chat";
import { useChatContext } from "stream-chat-react";
import { v4 as uuidv4 } from "uuid";
import { ChatProvider } from "../providers/chat-provider";
import { ChatInterface } from "./chat-interface";
import { ChatSidebar } from "./chat-sidebar";
import { useModel } from "@/contexts/model-context";
import { useProfile } from "@/contexts/profile-context";

// ── Auto-title helper ────────────────────────────────────────────────────────
// Generates a concise title from the first user message (runs client-side,
// no extra network call needed).
function generateTitle(text: string): string {
  const clean = text.trim().replace(/[?.!,]+$/, '').trim();
  if (clean.length <= 50) return clean;
  const cut = clean.slice(0, 50);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 20 ? cut.slice(0, lastSpace) : cut) + '…';
}

interface AuthenticatedAppProps {
  user: User;
  onLogout: () => void;
  onDeleteAccount: () => void;
}

export const AuthenticatedApp = ({ user, onLogout, onDeleteAccount }: AuthenticatedAppProps) => (
  <ChatProvider user={user}>
    <AuthenticatedCore user={user} onLogout={onLogout} onDeleteAccount={onDeleteAccount} />
  </ChatProvider>
);

const AuthenticatedCore = ({ user, onLogout, onDeleteAccount }: AuthenticatedAppProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { client, setActiveChannel } = useChatContext();
  const navigate = useNavigate();
  const { channelId } = useParams<{ channelId: string }>();
  const backendUrl = import.meta.env.VITE_BACKEND_URL as string;
  const { selectedModel } = useModel();
  const { activeProfile, categoryChanged } = useProfile();

  // When user switches to a persona in a DIFFERENT category, go to empty state (new session)
  useEffect(() => {
    if (categoryChanged) {
      setActiveChannel(undefined);
      navigate('/');
    }
  }, [categoryChanged]);

  useEffect(() => {
    const syncChannelWithUrl = async () => {
      if (!client) return;

      if (channelId) {
        const channel = client.channel("messaging", channelId);
        await channel.watch();
        setActiveChannel(channel);
      } else {
        setActiveChannel(undefined);
      }
    };
    syncChannelWithUrl();
  }, [channelId, client, setActiveChannel]);

  const handleNewChatMessage = async (message: { text: string }) => {
    if (!user.id) return;

    try {
      // Use the selected model from the hook called at component level
      console.log("Selected model in frontend:", selectedModel);

      // 1. Create a new channel with the user as the only member + persona metadata
      const newChannel = client.channel("messaging", uuidv4(), {
        name: `New ${activeProfile.name} Session`,
        members: [user.id],
        profileId: activeProfile.id,
        profileEmoji: activeProfile.emoji,
        profileName: activeProfile.name,
        profileCategory: activeProfile.category,
        usedProfileEmojis: [activeProfile.emoji],
      });
      await newChannel.watch();

      // 2. Set up event listener for when AI agent is added as member
      const memberAddedPromise = new Promise<void>((resolve) => {
        const unsubscribe = newChannel.on("member.added", (event) => {
          // Check if the added member is the AI agent (not the current user)
          if (event.member?.user?.id && event.member.user.id !== user.id) {
            unsubscribe.unsubscribe();
            resolve();
          }
        });
      });

      // 3. Connect the AI agent
      console.log("Sending request with model:", selectedModel);
      const response = await fetch(`${backendUrl}/start-ai-agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel_id: newChannel.id,
          channel_type: "messaging",
          model: selectedModel,
          profileId: activeProfile.id,
          customProfilePrompt: activeProfile.systemPrompt || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("AI agent failed to join the chat.");
      }

      // 4. Set the channel as active and navigate
      setActiveChannel(newChannel);
      navigate(`/chat/${newChannel.id}`);

      // 5. Wait for AI agent to be added as member, then send message with model
      await memberAddedPromise;
      await newChannel.sendMessage({
        ...message,
        custom: {
          model: selectedModel,
        },
      });

      // 6. Auto-generate a title from the first message and update the channel
      if (newChannel.state.messages.length === 1) {
        try {
          const generatedTitle = generateTitle(message.text);
          await newChannel.update({ name: generatedTitle });
          console.log("Chat title auto-generated:", generatedTitle);
        } catch (err) {
          console.error('Title update failed:', err);
          // Do NOT crash the chat — swallow the error silently
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Something went wrong";
      console.error("Error creating new chat:", errorMessage);
    }
  };

  const handleNewChatClick = () => {
    setActiveChannel(undefined);
    navigate("/");
    setSidebarOpen(false);
  };

  const handleDeleteClick = (channel: Channel) => {
    setChannelToDelete(channel);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (channelToDelete) {
      try {
        if (channelId === channelToDelete.id) {
          navigate("/");
        }
        await channelToDelete.delete();
      } catch (error) {
        console.error("Error deleting channel:", error);
      }
    }
    setShowDeleteDialog(false);
    setChannelToDelete(null);
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setChannelToDelete(null);
  };

  const handleDeleteAccountClick = () => {
    setShowDeleteAccountDialog(true);
  };

  const handleDeleteAccountConfirm = async () => {
    if (!user?.id) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`${backendUrl}/delete-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.reason || "Failed to delete account");
      }

      // Account deleted successfully, trigger logout
      onDeleteAccount();
    } catch (error) {
      console.error("Error deleting account:", error);
      // You might want to show a toast notification here
    } finally {
      setIsDeleting(false);
      setShowDeleteAccountDialog(false);
    }
  };

  const handleDeleteAccountCancel = () => {
    setShowDeleteAccountDialog(false);
  };

  if (!client) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">
          Connecting to chat...
        </p>
      </div>
    );
  }

  const filters: ChannelFilters = {
    type: "messaging",
    members: { $in: [user.id] },
  };
  const sort: ChannelSort = { last_message_at: -1 };
  const options = { state: true, presence: true, limit: 10 };

  return (
    <div className="flex h-full w-full">
      <ChatSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={onLogout}
        onNewChat={handleNewChatClick}
        onChannelDelete={handleDeleteClick}
        onDeleteAccount={handleDeleteAccountClick}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <ChatInterface
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onNewChatMessage={handleNewChatMessage}
          backendUrl={backendUrl}
        />
      </div>

      {/* Delete Chat Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Writing Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this writing session? This action
              cannot be undone and all content will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteAccountDialog} onOpenChange={setShowDeleteAccountDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete your account? This action
              cannot be undone and will:
              <br />
              <br />
              • Delete all your writing sessions and chat history
              <br />
              • Remove your account from the system
              <br />
              • Log you out immediately
              <br />
              <br />
              This action is irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteAccountCancel} disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccountConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting Account...
                </>
              ) : (
                "Delete Account Permanently"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
