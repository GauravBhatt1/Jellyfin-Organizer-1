import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { WSMessage } from "@shared/schema";

interface WebSocketContextType {
  lastMessage: WSMessage | null;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType>({
  lastMessage: null,
  isConnected: false,
});

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

    socket.onopen = () => {
      setIsConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WSMessage;
        setLastMessage(message);
      } catch (e) {
        console.error("Failed to parse WebSocket message:", e);
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      setTimeout(connect, 3000);
    };

    socket.onerror = () => {
      socket.close();
    };

    setWs(socket);

    return socket;
  }, []);

  useEffect(() => {
    const socket = connect();
    return () => {
      socket.close();
    };
  }, [connect]);

  return (
    <WebSocketContext.Provider value={{ lastMessage, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  return useContext(WebSocketContext);
}
