import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from "react";

export type ConnectionStatus = "connected" | "connecting" | "disconnected";

interface ConnectionContextValue {
  status: ConnectionStatus;
  isConnected: boolean;
  errorType: string | null;
  setStatus: (s: ConnectionStatus) => void;
  setErrorType: (t: string | null) => void;
  reconnect: () => void;
  _setReconnectFn: (fn: () => void) => void;
}

const ConnectionContext = createContext<ConnectionContextValue | null>(null);

export const ConnectionProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [errorType, setErrorType] = useState<string | null>(null);
  const [reconnectFn, setReconnectFn] = useState<(() => void) | null>(null);

  // Also track native online/offline to flag network drops
  useEffect(() => {
    const handleOffline = () => setStatus("disconnected");
    const handleOnline = () => {
      // Browser is back online – try reconnecting
      if (reconnectFn) reconnectFn();
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [reconnectFn]);

  const reconnect = useCallback(() => {
    if (reconnectFn) {
      setStatus("connecting");
      setErrorType(null);
      reconnectFn();
    } else {
      window.location.reload();
    }
  }, [reconnectFn]);

  const _setReconnectFn = useCallback((fn: () => void) => {
    setReconnectFn(() => fn);
  }, []);

  return (
    <ConnectionContext.Provider
      value={{
        status,
        isConnected: status === "connected",
        errorType,
        setStatus,
        setErrorType,
        reconnect,
        _setReconnectFn,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
};

export const useConnectionStatus = (): ConnectionContextValue => {
  const ctx = useContext(ConnectionContext);
  if (!ctx) throw new Error("useConnectionStatus must be used within a ConnectionProvider");
  return ctx;
};
