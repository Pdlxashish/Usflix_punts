/**
 * SharedAlbum
 * Displays shared media from both partners with filtering options.
 */
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/tanstack-react-start";
import { Loader2, Image as ImageIcon, Video, Filter, User, Users } from "lucide-react";
import { useLinkStatus } from "@/context/link-status";
import { useWebSocketEvent } from "@/context/websocket";
import { getMediaUrl } from "@/lib/api";

interface SharedMedia {
  id: string;
  type: "photo" | "video";
  title: string;
  thumbnailUrl: string;
  uploaderId: number;
  uploaderName: string;
  isYou: boolean;
  createdAt: string;
}

type FilterType = "all" | "image" | "video";
type UploaderFilter = "all" | "self" | "partner";

export function SharedAlbum() {
  const { getToken, isSignedIn } = useAuth();
  const { isLinked, partner } = useLinkStatus();
  const [media, setMedia] = useState<SharedMedia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [uploaderFilter, setUploaderFilter] = useState<UploaderFilter>("all");

  const fetchSharedMedia = useCallback(async () => {
    if (!isSignedIn || !isLinked) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.append("type", typeFilter);
      if (uploaderFilter !== "all") params.append("uploader", uploaderFilter);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/shared/albums?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch shared media");
      }

      const data = await response.json();

      if (data.ok && data.media) {
        setMedia(data.media);
      }
    } catch (err) {
      console.error("Error fetching shared media:", err);
      setError(err instanceof Error ? err.message : "Failed to load media");
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, isLinked, getToken, typeFilter, uploaderFilter]);

  useEffect(() => {
    fetchSharedMedia();
  }, [fetchSharedMedia]);

  // Listen for new media uploads via WebSocket
  useWebSocketEvent("album:new_media", useCallback((data: any) => {
    const newMedia: SharedMedia = {
      id: data.mediaId,
      type: data.type,
      title: "New Upload",
      thumbnailUrl: data.thumbnailUrl,
      uploaderId: data.uploaderId,
      uploaderName: data.uploaderName,
      isYou: false,
      createdAt: new Date().toISOString(),
    };

    setMedia((prev) => [newMedia, ...prev]);
  }, []));

  if (!isLinked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-muted/30 rounded-xl p-8">
        <Users className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No Partner Linked</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Link with your partner to view shared photos and videos.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-destructive/10 rounded-xl p-8">
        <p className="text-destructive text-center">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl md:text-3xl text-foreground">Shared Album</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Media from you and {partner?.name || "your partner"}
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as FilterType)}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Media</option>
            <option value="image">Photos Only</option>
            <option value="video">Videos Only</option>
          </select>

          {/* Uploader Filter */}
          <select
            value={uploaderFilter}
            onChange={(e) => setUploaderFilter(e.target.value as UploaderFilter)}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">Everyone</option>
            <option value="self">You</option>
            <option value="partner">Partner</option>
          </select>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && media.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 bg-muted/30 rounded-xl">
          <ImageIcon className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground">No media yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            {typeFilter !== "all" || uploaderFilter !== "all"
              ? "Try changing your filters"
              : "Start uploading photos and videos to share!"}
          </p>
        </div>
      )}

      {/* Media Grid */}
      {!isLoading && media.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {media.map((item) => (
            <div
              key={item.id}
              className="group relative aspect-square rounded-lg overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all cursor-pointer"
            >
              {/* Thumbnail */}
              <img
                src={getMediaUrl(item.thumbnailUrl)}
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                loading="lazy"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Media Type Icon */}
              <div className="absolute top-2 right-2">
                {item.type === "video" ? (
                  <div className="p-1.5 rounded-full bg-black/60 backdrop-blur-sm">
                    <Video className="h-3 w-3 text-white" />
                  </div>
                ) : (
                  <div className="p-1.5 rounded-full bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    <ImageIcon className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>

              {/* Uploader Badge */}
              <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-full">
                  <User className="h-3 w-3 text-white" />
                  <span className="text-xs text-white font-medium">
                    {item.isYou ? "You" : item.uploaderName}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Media Count */}
      {!isLoading && media.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {media.length} {media.length === 1 ? "item" : "items"}
        </p>
      )}
    </div>
  );
}
