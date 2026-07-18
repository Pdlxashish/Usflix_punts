/**
 * WebSocketContext
 * Manages WebSocket connection for real-time updates.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@clerk/tanstack-react-start";

type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

type EventListener = (data: any) => void;

interface WebSocketContextValue {
  connectionState: ConnectionState;
  send: (message: any) => void;
  addEventListener: (eventType: string, listener: EventListener) => () => void;
  removeEventListener: (eventType: string, listener: EventListener) => void;
}

const WebSocketContext = createContext<WebSocketContextValue | undefined>(undefined);

function resolveWebSocketUrl(): string {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }

  const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
  if (apiUrl) {
    return `${apiUrl.replace(/^http/, "ws")}/ws`;
  }

  if (!import.meta.env.PROD) {
    return "ws://localhost:3001/ws";
  }

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/ws`;
  }

  return "ws://localhost:3001/ws";
}

const WS_URL = resolveWebSocketUrl();
const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 30000; // 30 seconds

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn } = useAuth();
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eventListenersRef = useRef<Map<string, Set<EventListener>>>(new Map());
  const isIntentionalDisconnectRef = useRef(false);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const calculateReconnectDelay = useCallback(() => {
    const delay = Math.min(
      INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current),
      MAX_RECONNECT_DELAY
    );
    return delay;
  }, []);

  const connect = useCallback(async () => {
    console.log("[WS CLIENT] connect() called - isSignedIn:", isSignedIn, "currentState:", wsRef.current?.readyState);
    
    if (!isSignedIn || wsRef.current?.readyState === WebSocket.OPEN) {
      console.log("[WS CLIENT] Skipping connect - not signed in or already open");
      return;
    }

    try {
      console.log("[WS CLIENT] Setting state to 'connecting'...");
      setConnectionState("connecting");

      console.log("[WS CLIENT] Getting auth token...");
      const token = await getToken();
      if (!token) {
        console.error("[WS CLIENT] ❌ No auth token available!");
        throw new Error("No auth token available");
      }
      console.log("[WS CLIENT] ✅ Token obtained");

      const wsUrl = `${WS_URL}?token=${token}`;
      console.log("[WS CLIENT] Connecting to:", WS_URL);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      console.log("[WS CLIENT] WebSocket object created, waiting for connection...");

      ws.onopen = () => {
        console.log("[WS CLIENT] ✅✅✅ WebSocket connected successfully!");
        console.log("[WS CLIENT] Connection state:", ws.readyState);
        setConnectionState("connected");
        reconnectAttemptsRef.current = 0;
        clearReconnectTimeout();
      };

      ws.onmessage = (event) => {
        console.log("[WS CLIENT] 📨 Message received, length:", event.data.length);
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log("[WS CLIENT] Message type:", message.type, "data:", message.data);
          
          // Handle ping/pong
          if (message.type === "ping") {
            ws.send(JSON.stringify({ type: "pong" }));
            return;
          }

          // Dispatch event to listeners
          const listeners = eventListenersRef.current.get(message.type);
          console.log("[WS CLIENT] Listeners for", message.type, ":", listeners?.size || 0);
          if (listeners) {
            listeners.forEach((listener) => {
              try {
                listener(message.data);
              } catch (error) {
                console.error(`Error in event listener for ${message.type}:`, error);
              }
            });
          }

          // Also dispatch to wildcard listeners (*)
          const wildcardListeners = eventListenersRef.current.get("*");
          if (wildcardListeners) {
            wildcardListeners.forEach((listener) => {
              try {
                listener(message);
              } catch (error) {
                console.error("Error in wildcard event listener:", error);
              }
            });
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("[WS CLIENT] ❌❌❌ WebSocket error occurred:", error);
        console.error("[WS CLIENT] Error details - readyState:", ws.readyState, "url:", WS_URL);
        setConnectionState("error");
      };

      ws.onclose = (event) => {
        console.log("[WS CLIENT] WebSocket disconnected - code:", event.code, "reason:", event.reason);
        console.log("[WS CLIENT] Was clean close:", event.wasClean);
        wsRef.current = null;

        if (!isIntentionalDisconnectRef.current) {
          setConnectionState("disconnected");

          // Attempt reconnection with exponential backoff
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            const delay = calculateReconnectDelay();
            console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);

            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current++;
              connect();
            }, delay);
          } else {
            console.error("Max reconnection attempts reached");
            setConnectionState("error");
          }
        } else {
          setConnectionState("disconnected");
        }
      };
    } catch (error) {
      console.error("[WS CLIENT] ❌ Error in connect():", error);
      console.error("[WS CLIENT] Error stack:", (error as Error).stack);
      setConnectionState("error");
    }
  }, [isSignedIn, getToken, clearReconnectTimeout, calculateReconnectDelay]);

  const disconnect = useCallback(() => {
    isIntentionalDisconnectRef.current = true;
    clearReconnectTimeout();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionState("disconnected");
  }, [clearReconnectTimeout]);

  // Connect when signed in, disconnect when signed out
  useEffect(() => {
    if (isSignedIn) {
      isIntentionalDisconnectRef.current = false;
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isSignedIn, connect, disconnect]);

  const send = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket is not connected. Message not sent:", message);
    }
  }, []);

  const addEventListener = useCallback((eventType: string, listener: EventListener) => {
    if (!eventListenersRef.current.has(eventType)) {
      eventListenersRef.current.set(eventType, new Set());
    }
    eventListenersRef.current.get(eventType)!.add(listener);

    // Return cleanup function
    return () => {
      removeEventListener(eventType, listener);
    };
  }, []);

  const removeEventListener = useCallback((eventType: string, listener: EventListener) => {
    const listeners = eventListenersRef.current.get(eventType);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        eventListenersRef.current.delete(eventType);
      }
    }
  }, []);

  const value: WebSocketContextValue = {
    connectionState,
    send,
    addEventListener,
    removeEventListener,
  };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}

/**
 * Hook to access WebSocket connection
 */
export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
}

/**
 * Hook to listen to a specific WebSocket event
 */
export function useWebSocketEvent(eventType: string, handler: EventListener) {
  const { addEventListener } = useWebSocket();

  useEffect(() => {
    const cleanup = addEventListener(eventType, handler);
    return cleanup;
  }, [eventType, handler, addEventListener]);
}
