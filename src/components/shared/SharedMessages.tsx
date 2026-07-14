/**
 * SharedMessages
 * Chat interface for messaging with partner.
 */
import { useState, useEffect, useRef } from "react";
import { Send, Loader2, MessageCircle, ChevronDown } from "lucide-react";
import { useSharedMessages } from "@/context/shared-messages";
import { useLinkStatus } from "@/context/link-status";
import { useToast } from "@/components/ui/Toast";

export function SharedMessages() {
  const toast = useToast();
  const { isLinked, partner } = useLinkStatus();
  const {
    messages,
    unreadCount,
    isLoading,
    isSending,
    hasMore,
    error,
    sendMessage,
    markAsRead,
    loadMore,
  } = useSharedMessages();
  const [messageText, setMessageText] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length]);

  // Mark as read when component is visible
  useEffect(() => {
    if (unreadCount > 0) {
      markAsRead();
    }
  }, [unreadCount, markAsRead]);

  // Show/hide scroll to bottom button
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || isSending) return;

    try {
      await sendMessage(messageText);
      setMessageText("");
    } catch (err) {
      toast.error("Failed to send message");
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffInHours < 168) {
      return date.toLocaleDateString([], { weekday: "short", hour: "2-digit", minute: "2-digit" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    }
  };

  if (!isLinked) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] bg-muted/30 rounded-xl p-8">
        <MessageCircle className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No Partner Linked</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Link with your partner to start sharing messages, memories, and more.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] bg-destructive/10 rounded-xl p-8">
        <p className="text-destructive text-center">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          {partner?.profilePictureUrl ? (
            <img
              src={partner.profilePictureUrl}
              alt={partner.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
          )}
          <div>
            <h3 className="font-medium text-foreground">{partner?.name || "Partner"}</h3>
            <p className="text-xs text-muted-foreground">Chat with your partner</p>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-6 space-y-4"
      >
        {/* Load More Button */}
        {hasMore && !isLoading && messages.length > 0 && (
          <button
            type="button"
            onClick={loadMore}
            className="w-full py-2 text-sm text-primary hover:underline"
          >
            Load older messages
          </button>
        )}

        {/* Loading */}
        {isLoading && messages.length === 0 && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Send a message to start the conversation!
            </p>
          </div>
        )}

        {/* Messages (reverse order - newest at bottom) */}
        {messages
          .slice()
          .reverse()
          .map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isYou ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                  message.isYou
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {!message.isYou && (
                  <p className="text-xs font-medium mb-1 opacity-70">{message.senderName}</p>
                )}
                <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                <p
                  className={`text-xs mt-1 ${
                    message.isYou ? "text-primary-foreground/70" : "text-muted-foreground"
                  }`}
                >
                  {formatTime(message.createdAt)}
                </p>
              </div>
            </div>
          ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-24 right-8 p-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      )}

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-muted/30">
        <div className="flex gap-2">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type a message..."
            disabled={isSending}
            className="flex-1 px-4 py-3 bg-background border border-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!messageText.trim() || isSending}
            className="shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isSending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
