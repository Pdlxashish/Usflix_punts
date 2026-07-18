/**
 * SharedMessagesContext
 * Manages shared messages between linked partners.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@clerk/tanstack-react-start";
import { api } from "@/lib/api";
import { useWebSocketEvent } from "./websocket";
import { useLinkStatus } from "./link-status";

interface Message {
  id: string;
  senderId: number;
  senderName: string;
  text: string;
  createdAt: string;
  readByPartner: boolean;
  isYou: boolean;
}

interface SharedMessagesContextValue {
  messages: Message[];
  unreadCount: number;
  isLoading: boolean;
  isSending: boolean;
  hasMore: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
  markAsRead: () => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

const SharedMessagesContext = createContext<SharedMessagesContextValue | undefined>(undefined);

export function SharedMessagesProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn } = useAuth();
  const { isLinked } = useLinkStatus();
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Fetch messages
  const fetchMessages = useCallback(async (limit = 50, offset = 0) => {
    if (!isSignedIn || !isLinked) return;

    try {
      setIsLoading(true);
      setError(null);

      const token = await getToken();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/shared/messages?limit=${limit}&offset=${offset}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }

      const data = await response.json();

      if (data.ok && data.messages) {
        if (offset === 0) {
          setMessages(data.messages);
        } else {
          setMessages((prev) => [...prev, ...data.messages]);
        }
        setHasMore(data.messages.length === limit);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch messages");
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, isLinked, getToken]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!isSignedIn || !isLinked) return;

    try {
      const token = await getToken();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/shared/messages/unread-count`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          setUnreadCount(data.unreadCount || 0);
        }
      }
    } catch (err) {
      console.error("Error fetching unread count:", err);
    }
  }, [isSignedIn, isLinked, getToken]);

  // Initial load
  useEffect(() => {
    if (isLinked) {
      fetchMessages();
      fetchUnreadCount();
    }
  }, [isLinked, fetchMessages, fetchUnreadCount]);

  // Send message
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setIsSending(true);
    try {
      const data = await api.post<{
        ok: boolean;
        message?: Message;
        error?: string;
      }>("/shared/messages", {
        messageText: text.trim(),
      });

      if (data.ok && data.message) {
        // Add message to local state
        setMessages((prev) => [data.message!, ...prev]);
      } else {
        throw new Error(data.error || "Failed to send message");
      }
    } catch (err) {
      console.error("Error sending message:", err);
      throw err;
    } finally {
      setIsSending(false);
    }
  }, []);

  // Mark messages as read
  const markAsRead = useCallback(async () => {
    if (!isSignedIn || !isLinked || unreadCount === 0) return;

    try {
      const token = await getToken();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/shared/messages/read`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setUnreadCount(0);
        // Update local messages
        setMessages((prev) =>
          prev.map((msg) => ({ ...msg, readByPartner: true }))
        );
      }
    } catch (err) {
      console.error("Error marking messages as read:", err);
    }
  }, [isSignedIn, isLinked, unreadCount, getToken]);

  // Load more messages
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    await fetchMessages(50, messages.length);
  }, [isLoading, hasMore, messages.length, fetchMessages]);

  // Refresh messages
  const refresh = useCallback(async () => {
    await fetchMessages();
    await fetchUnreadCount();
  }, [fetchMessages, fetchUnreadCount]);

  // Listen for new messages via WebSocket
  useWebSocketEvent("message:new", useCallback((data: any) => {
    const newMessage: Message = {
      id: data.messageId,
      senderId: data.senderId,
      senderName: data.senderName,
      text: data.text,
      createdAt: data.createdAt,
      readByPartner: false,
      isYou: false, // From partner
    };

    setMessages((prev) => [newMessage, ...prev]);
    setUnreadCount((prev) => prev + 1);
  }, []));

  const value: SharedMessagesContextValue = {
    messages,
    unreadCount,
    isLoading,
    isSending,
    hasMore,
    error,
    sendMessage,
    markAsRead,
    loadMore,
    refresh,
  };

  return (
    <SharedMessagesContext.Provider value={value}>
      {children}
    </SharedMessagesContext.Provider>
  );
}

/**
 * Hook to access shared messages
 */
export function useSharedMessages() {
  const context = useContext(SharedMessagesContext);
  if (context === undefined) {
    throw new Error("useSharedMessages must be used within a SharedMessagesProvider");
  }
  return context;
}
