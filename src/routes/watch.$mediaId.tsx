/**
 * /watch/:mediaId — full-screen video watch route (Req 4 AC1)
 * Navigating here renders the VideoPlayer over a black background.
 * Closing the player navigates back.
 */
import { createFileRoute, useNavigate, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { mediaItems as staticMediaItems, type MediaItem } from "@/data/media";
import { useProfile } from "@/context/profile";
import { logViewerActivity } from "@/lib/activity";

export const Route = createFileRoute("/watch/$mediaId")({
  component: WatchPage,
  loader: async ({ params }) => {
    // Try to fetch from API first
    try {
      const response = await fetch(`/api/media/${params.mediaId}`, { credentials: "include" });
      if (response.ok) {
        const item: MediaItem = await response.json();
        if (item.type === "video" && item.videoUrl) {
          return { item };
        }
      }
    } catch (error) {
      console.error("Failed to fetch media item:", error);
    }

    // Fallback to static data
    const item = staticMediaItems.find((m) => m.id === params.mediaId);
    if (!item || item.type !== "video" || !item.videoUrl) throw notFound();
    return { item };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [{ title: `${loaderData.item.title} — USFLIX` }]
      : [],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <p className="font-display text-2xl mb-4">Video not found</p>
        <a href="/albums" className="text-primary underline">Back to albums</a>
      </div>
    </div>
  ),
});

function WatchPage() {
  const { item } = Route.useLoaderData();
  const navigate = useNavigate();
  const { activeProfile } = useProfile();

  useEffect(() => {
    if (!activeProfile) return;
    logViewerActivity("media_viewed", activeProfile.id, {
      mediaId: item.id,
      mediaTitle: item.title,
      mediaType: item.type,
    });
  }, [activeProfile?.id, item.id, item.title, item.type]);

  return (
    <VideoPlayer
      key={item.id} // Force remount when mediaId changes
      mediaId={item.id}
      src={item.videoUrl!}
      title={item.title}
      collectionName={item.category}
      onClose={() => navigate({ to: "/albums" })}
      onPlayNext={(nextId) => navigate({ to: "/watch/$mediaId", params: { mediaId: nextId } })}
    />
  );
}
