import { ReactNode, useCallback, useEffect, useState, useRef } from "react";
import { StreamChat, User } from "stream-chat";
import { Chat } from "stream-chat-react";
import { useTheme } from "../hooks/use-theme";
import { Bot, AlertTriangle, RefreshCw, Server, Wifi, WifiOff } from "lucide-react";
import { ConnectionProvider, useConnectionStatus } from "../contexts/connection-context";

interface ChatProviderProps {
  user: User;
  children: ReactNode;
}

const apiKey = import.meta.env.VITE_STREAM_API_KEY as string;
const backendUrl = import.meta.env.VITE_BACKEND_URL as string;

const CONNECTION_TIMEOUT_MS = 20000;

if (!apiKey) {
  throw new Error("Missing VITE_STREAM_API_KEY in .env file");
}

type ErrorType = "backend_down" | "token_failed" | "stream_suspended" | "network" | "unknown";

// Error screen shown when Stream Chat cannot connect (full-page fallback)
const ConnectionErrorScreen = ({
  error,
  errorType,
  onRetry,
}: {
  error: string;
  errorType: ErrorType;
  onRetry: () => void;
}) => {
  const iconMap: Record<ErrorType, React.ReactNode> = {
    backend_down: <Server className="h-8 w-8 text-destructive" />,
    token_failed: <Server className="h-8 w-8 text-destructive" />,
    stream_suspended: <WifiOff className="h-8 w-8 text-destructive" />,
    network: <Wifi className="h-8 w-8 text-destructive" />,
    unknown: <AlertTriangle className="h-8 w-8 text-destructive" />,
  };

  const stepsMap: Record<ErrorType, string[]> = {
    backend_down: [
      "Make sure the backend server is running (npm run dev in the server folder)",
      `The backend should be listening on ${backendUrl}`,
    ],
    token_failed: [
      "The backend is running but failed to generate a token",
      "Check server logs for errors",
      "Verify STREAM_API_KEY and STREAM_API_SECRET in server/.env are correct",
    ],
    stream_suspended: [
      "Your Stream Chat project may be suspended",
      "Log in at https://dashboard.getstream.io and check project status",
      "Verify the API Key in your .env matches your active project",
    ],
    network: [
      "Check your internet connection",
      "Try refreshing the page",
    ],
    unknown: [
      "Make sure both frontend and backend servers are running",
      "Check your .env files for correct Stream Chat credentials",
      "Visit https://dashboard.getstream.io to verify your project is active",
    ],
  };

  return (
    <div className="flex h-screen items-center justify-center bg-background p-4">
      <div className="text-center max-w-md space-y-5">
        <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto">
          {iconMap[errorType]}
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Connection Failed</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{error}</p>
        </div>
        {stepsMap[errorType].length > 0 && (
          <div className="bg-muted/30 border border-muted-foreground/10 rounded-lg p-4 text-left space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">How to fix:</p>
            <ol className="space-y-1.5">
              {stepsMap[errorType].map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="font-bold text-foreground mt-0.5 shrink-0">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      </div>
    </div>
  );
};

const LoadingScreen = ({ elapsed }: { elapsed: number }) => (
  <div className="flex h-screen items-center justify-center bg-background">
    <div className="text-center space-y-4">
      <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto">
        <Bot className="h-6 w-6 text-primary-foreground" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">
            {elapsed > 8000 ? "Still connecting, please wait..." : "Setting up your AI assistant..."}
          </p>
        </div>
        {elapsed > 8000 && (
          <p className="text-xs text-muted-foreground/60">
            This is taking longer than usual...
          </p>
        )}
      </div>
    </div>
  </div>
);

/**
 * Inner provider that has access to ConnectionContext.
 * Handles token fetching, manual client creation, auto-retries, and cleanup.
 */
const ChatClientProvider = ({ user, children }: ChatProviderProps) => {
  const { theme } = useTheme();
  const { setStatus, setErrorType } = useConnectionStatus();
  const [chatClient, setChatClient] = useState<StreamChat | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [errorType, setLocalErrorType] = useState<ErrorType>("unknown");
  const [elapsed, setElapsed] = useState(0);
  const [retryKey, setRetryKey] = useState(0);

  // Auto-refreshing Token Provider function passed to Stream SDK
  const tokenProvider = useCallback(async () => {
    if (!user) throw new Error("User not available");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    let response: Response;
    try {
      response = await fetch(`${backendUrl}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      throw new Error(`Cannot reach backend at ${backendUrl}. Is it running?`);
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => `HTTP ${response.status}`);
      throw new Error(`Token fetch failed: ${errorText}`);
    }

    const { token } = await response.json();
    localStorage.setItem('stream_jwt_token', token);
    return token;
  }, [user]);

  // Stable ref for tokenProvider — avoids adding it to useEffect deps
  const tokenProviderRef = useRef(tokenProvider);
  useEffect(() => { tokenProviderRef.current = tokenProvider; }, [tokenProvider]);

  useEffect(() => {
    let isMounted = true;
    let client: StreamChat | null = null;
    let currentTimeout: ReturnType<typeof setTimeout>;
    let retryCount = 0;
    let isConnecting = false; // lock to prevent double connectUser

    const connectChat = async () => {
      if (isConnecting) return; // Guard against concurrent calls
      isConnecting = true;
      try {
        if (!isMounted) return;
        setStatus("connecting");
        setConnectionError(null);
        setErrorType(null);

        // Get the singleton client and disconnect if already connected
        client = StreamChat.getInstance(apiKey);
        if (client.userID) {
          await client.disconnectUser();
        }

        // Connect with the token provider — use ref so Effect doesn't re-run when tokenProvider changes
        await client.connectUser(user, tokenProviderRef.current);

        if (isMounted) {
          setChatClient(client);
          setStatus("connected");
          setErrorType(null);
        }

      } catch (error: any) {
        isConnecting = false;
        if (!isMounted) return;
        
        console.error("Stream Chat connection error:", error);

        // Auto-Retry Logic (3 retries, 2s delay)
        if (retryCount < 3) {
          retryCount++;
          console.log(`Connection failed, retrying in 2 seconds (Attempt ${retryCount}/3)...`);
          currentTimeout = setTimeout(connectChat, 2000);
        } else {
          // Determine Error Type for UX
          const isNetwork = !navigator.onLine || error.message?.includes("fetch");
          const isToken = error.message?.includes("token");
          const errType: ErrorType = isNetwork ? "network" : isToken ? "token_failed" : "stream_suspended";
          
          setLocalErrorType(errType);
          setErrorType(errType);
          setStatus("disconnected");
          setConnectionError(error.message || "Failed to connect to Stream Chat. Project may be suspended.");
        }
      }
    };

    connectChat();

    // Loading timer tracking for UX
    const start = Date.now();
    const loadingInterval = setInterval(() => {
      if (isMounted && !client?.userID && !connectionError) {
        setElapsed(Date.now() - start);
      }
    }, 1000);

    // Strict unmount cleanup
    return () => {
      isMounted = false;
      clearInterval(loadingInterval);
      if (currentTimeout) clearTimeout(currentTimeout);
      if (client) {
        client.disconnectUser().catch(console.error);
      }
    };
  // Only re-run when userId or retryKey changes — NOT on tokenProvider re-creation
  }, [user.id, retryKey, setStatus, setErrorType]);

  const handleRetry = () => {
    // Manually trigger a fresh connect attempt
    setRetryKey(k => k + 1);
  };

  if (connectionError) {
    return (
      <ConnectionErrorScreen
        error={connectionError}
        errorType={errorType}
        onRetry={handleRetry}
      />
    );
  }

  if (!chatClient) {
    return <LoadingScreen elapsed={elapsed} />;
  }

  return (
    <Chat client={chatClient} theme={theme === "dark" ? "str-chat__theme-dark" : "str-chat__theme-light"}>
      {children}
    </Chat>
  );
};

/**
 * Public ChatProvider — wraps ConnectionProvider then ChatClientProvider.
 */
export const ChatProvider = ({ user, children }: ChatProviderProps) => (
  <ConnectionProvider>
    <ChatClientProvider user={user}>{children}</ChatClientProvider>
  </ConnectionProvider>
);
