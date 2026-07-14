/**
 * PartnerSearch
 * Search for partner by username or email and send invitation.
 */
import { useState, useEffect, useCallback } from "react";
import { Search, Loader2, Send, UserPlus } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { useLinkStatus } from "@/context/link-status";

interface PartnerSearchResult {
  userId: number;
  displayName: string;
  email: string;
  profilePictureUrl: string | null;
}

interface PartnerSearchProps {
  onSuccess?: () => void;
}

export function PartnerSearch({ onSuccess }: PartnerSearchProps) {
  const toast = useToast();
  const { refreshLinkStatus } = useLinkStatus();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PartnerSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sendingTo, setSendingTo] = useState<number | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 3) {
        performSearch(query.trim());
      } else {
        setResults([]);
        setSearchError(null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setIsSearching(true);
    setSearchError(null);

    try {
      const data = await api.post<{
        ok: boolean;
        users?: PartnerSearchResult[];
        error?: string;
      }>("/partner/search", {
        query: searchQuery,
      });

      if (data.ok && data.users) {
        setResults(data.users);
        if (data.users.length === 0) {
          setSearchError("No users found matching your search");
        }
      } else {
        setSearchError(data.error || "Search failed");
        setResults([]);
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchError(error instanceof Error ? error.message : "Network error");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendInvite = async (userId: number, email: string) => {
    setSendingTo(userId);

    try {
      const data = await api.post<{
        ok: boolean;
        inviteUrl?: string;
        error?: string;
      }>("/invitations", {
        inviteeUserId: userId,
        inviteeEmail: email,
      });

      if (data.ok) {
        toast.success("Invitation sent successfully!");
        await refreshLinkStatus();
        onSuccess?.();
      } else {
        toast.error(data.error || "Failed to send invitation");
      }
    } catch (error) {
      console.error("Send invite error:", error);
      toast.error(error instanceof Error ? error.message : "Network error");
    } finally {
      setSendingTo(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Enter at least 3 characters to search for your partner
      </p>

      {/* Search Error */}
      {searchError && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
          {searchError}
        </div>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            Found {results.length} {results.length === 1 ? "user" : "users"}
          </p>
          {results.map((user) => (
            <div
              key={user.userId}
              className="flex items-center gap-3 p-3 bg-muted/50 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              {/* Profile Picture */}
              {user.profilePictureUrl ? (
                <img
                  src={user.profilePictureUrl}
                  alt={user.displayName}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <UserPlus className="h-6 w-6 text-primary" />
                </div>
              )}

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{user.displayName}</p>
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              </div>

              {/* Send Invite Button */}
              <button
                type="button"
                onClick={() => handleSendInvite(user.userId, user.email)}
                disabled={sendingTo === user.userId}
                className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {sendingTo === user.userId ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Invite
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isSearching && !searchError && query.trim().length >= 3 && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-3">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No users found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Try searching with a different name or email
          </p>
        </div>
      )}

      {/* Initial State */}
      {query.trim().length < 3 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-3">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">Search for your partner</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Enter their name or email address to find them and send a partner link invitation
          </p>
        </div>
      )}
    </div>
  );
}
