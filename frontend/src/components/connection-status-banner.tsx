import { useEffect, useRef, useState } from "react";
import { Wifi, WifiOff, RefreshCw, X, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConnectionStatus } from "@/contexts/connection-context";

/**
 * ConnectionStatusBanner
 * A slim, industry-grade banner that shows connection state.
 *
 * - Hidden when connected (briefly flashes green on first connect)
 * - Yellow/amber when connecting (spinner)
 * - Red when disconnected (with Connect button)
 */
export const ConnectionStatusBanner = () => {
  const { status, reconnect } = useConnectionStatus();
  const [visible, setVisible] = useState(false);
  const [showConnected, setShowConnected] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const prevStatus = useRef(status);
  const connectedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // When transitioning from non-connected → connected, flash green
    if (prevStatus.current !== "connected" && status === "connected") {
      setShowConnected(true);
      setVisible(true);
      setDismissed(false);
      if (connectedTimerRef.current) clearTimeout(connectedTimerRef.current);
      connectedTimerRef.current = setTimeout(() => {
        setVisible(false);
        setShowConnected(false);
      }, 3000);
    }

    // When disconnected / connecting, always show (and cancel green timer)
    if (status !== "connected") {
      if (connectedTimerRef.current) clearTimeout(connectedTimerRef.current);
      setShowConnected(false);
      setVisible(true);
      setDismissed(false);
    }

    prevStatus.current = status;
  }, [status]);

  if (!visible || dismissed) return null;

  // ─── Connected flash ────────────────────────────────────────────────────────
  if (showConnected) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-2 text-xs font-medium",
          "bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
          "animate-in slide-in-from-top-2 duration-300"
        )}
      >
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        <span>Connected — AI assistant is ready</span>
        <button
          onClick={() => setVisible(false)}
          className="ml-auto opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  // ─── Connecting ─────────────────────────────────────────────────────────────
  if (status === "connecting") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-2 text-xs font-medium",
          "bg-amber-500/10 border-b border-amber-500/30 text-amber-700 dark:text-amber-400",
          "animate-in slide-in-from-top-2 duration-300"
        )}
      >
        <div className="h-3.5 w-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0" />
        <span>Connecting to AI service…</span>
      </div>
    );
  }

  // ─── Disconnected ───────────────────────────────────────────────────────────
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 text-xs font-medium",
        "bg-destructive/10 border-b border-destructive/30 text-destructive",
        "animate-in slide-in-from-top-2 duration-300"
      )}
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1 leading-none">
        You're not connected. Messages won't reach the AI model.
      </span>

      {/* Highlighted Connect button */}
      <button
        onClick={reconnect}
        id="connection-reconnect-btn"
        className={cn(
          "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold",
          "bg-destructive text-destructive-foreground",
          "hover:bg-destructive/90 transition-all duration-150",
          "ring-2 ring-destructive/40 ring-offset-1 ring-offset-background",
          "animate-pulse hover:animate-none shadow-sm shadow-destructive/30"
        )}
      >
        <Wifi className="h-3 w-3" />
        Connect
      </button>

      <button
        onClick={() => setDismissed(true)}
        className="ml-1 opacity-50 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

/**
 * Compact status dot for the header bot icon — shows colored ring based on status.
 */
export const ConnectionStatusDot = ({ className }: { className?: string }) => {
  const { status } = useConnectionStatus();

  if (status === "connected") {
    return (
      <div
        className={cn(
          "w-3 h-3 bg-green-500 rounded-full border-2 border-background",
          className
        )}
      />
    );
  }
  if (status === "connecting") {
    return (
      <div
        className={cn(
          "w-3 h-3 bg-amber-500 rounded-full border-2 border-background animate-pulse",
          className
        )}
      />
    );
  }
  // disconnected
  return (
    <div
      className={cn(
        "w-3 h-3 bg-destructive rounded-full border-2 border-background animate-ping",
        className
      )}
    />
  );
};

/**
 * Inline "not connected" notice for the input area.
 */
export const InputOfflineNotice = ({ onConnect }: { onConnect: () => void }) => (
  <div
    className={cn(
      "mx-4 mb-2 flex items-center gap-2 px-3 py-2 rounded-lg",
      "bg-amber-500/10 border border-amber-500/30",
      "animate-in slide-in-from-bottom-2 duration-200"
    )}
  >
    <WifiOff className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
    <span className="flex-1 text-xs text-amber-700 dark:text-amber-400 leading-none">
      Not connected — this message won't be sent to the AI model.
    </span>
    <button
      onClick={onConnect}
      className={cn(
        "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold",
        "bg-amber-500 text-white hover:bg-amber-600",
        "ring-1 ring-amber-400/60 ring-offset-1 ring-offset-background",
        "transition-all duration-150 animate-pulse hover:animate-none"
      )}
    >
      <RefreshCw className="h-3 w-3" />
      Connect
    </button>
  </div>
);
