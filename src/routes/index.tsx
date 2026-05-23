import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef } from "react";
import { Hero } from "@/components/site/Hero";
import { TimeTogether } from "@/components/site/TimeTogether";
import { AnniversaryCountdown } from "@/components/site/AnniversaryCountdown";
import { OnThisDay } from "@/components/site/OnThisDay";
import { DistanceBetweenLoader as DistanceBetween } from "@/components/site/DistanceBetweenLoader";
import { BirthdayCelebration } from "@/components/site/BirthdayCelebration";
import { StoryContinues } from "@/components/site/StoryContinues";
import { LoveLetterWall } from "@/components/site/LoveLetterWall";
import { LoveJar } from "@/components/site/LoveJar";
import { MoodBoard } from "@/components/site/MoodBoard";
import { OurFirstTimes } from "@/components/site/OurFirstTimes";
import { RelationshipQuiz } from "@/components/site/RelationshipQuiz";
import { OurBucketList } from "@/components/site/OurBucketList";
import { RandomMemory } from "@/components/site/RandomMemory";
import { MoodOfTheDay } from "@/components/site/MoodOfTheDay";
import { TimeGreeting } from "@/components/site/TimeGreeting";
import { OurPlaylist } from "@/components/site/OurPlaylist";
import { WeatherWidget } from "@/components/site/WeatherWidget";
import { SharedCanvas } from "@/components/site/SharedCanvas";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { ContentRow } from "@/components/site/ContentRow";
import { VoiceNoteRow } from "@/components/site/VoiceNoteRow";
import { ContentRowSkeleton } from "@/components/ui/skeleton";
import { useHeartRainfall } from "@/context/heartRainfall";
import { mediaItems as staticMediaItems, type MediaItem, type Collection } from "@/data/media";
import { useBranding } from "@/context/branding";
import { useProfile } from "@/context/profile";
import { Film, Upload, AlertCircle } from "lucide-react";
import { fetchApiJson } from "@/lib/fetchApi";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "USFLIX — Our Story" },
      { name: "description", content: "Every memory we've made, in one cinematic place." },
    ],
  }),
});

function Index() {
  const { branding } = useBranding();
  const { myList } = useProfile();
  const { triggerHeartRainfall } = useHeartRainfall();
  const navigate = useNavigate();
  const welcomeRainfallTriggered = useRef(false);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [playingItem, setPlayingItem] = useState<MediaItem | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Fetch both collections and media from backend
  useEffect(() => {
    const fetchData = async () => {
      setApiError(null);
      try {
        const [data, cols] = await Promise.all([
          fetchApiJson<MediaItem[]>("/media"),
          fetchApiJson<Collection[]>("/collections"),
        ]);
        setMediaItems(data);
        setCollections(cols);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setMediaItems([]);
        setCollections([]);
        setApiError(
          error instanceof Error
            ? error.message
            : "Cannot connect to the backend. Your memories are still saved in the database — start the API server.",
        );
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Welcome heart rainfall when home page opens (5 seconds, full viewport)
  useEffect(() => {
    if (welcomeRainfallTriggered.current) return;
    welcomeRainfallTriggered.current = true;
    triggerHeartRainfall();
  }, [triggerHeartRainfall]);

  // Build category list from BOTH collections and actual media items
  const allCategories = useMemo(() => {
    const fromCollections = collections.map((c) => c.name);
    const fromMedia = mediaItems.map((m) => m.category);
    return Array.from(new Set([...fromCollections, ...fromMedia])).filter(Boolean);
  }, [collections, mediaItems]);

  // Build rows: one row per category that has media items
  const browseRows = useMemo(() => {
    return allCategories
      .map((cat) => ({
        collectionId: cat,
        title: cat,
        items: mediaItems
          .filter((m) => m.category === cat && m.status === "ready" && m.type !== "voice")
          .sort((a, b) => a.sortRank - b.sortRank),
      }))
      .filter((row) => row.items.length > 0);
  }, [allCategories, mediaItems]);

  // Voice notes — shown in their own section
  const voiceNotes = useMemo(
    () => mediaItems.filter((m) => m.type === "voice" && m.status === "ready"),
    [mediaItems],
  );

  const myListItems = useMemo(
    () => myList.map((id) => mediaItems.find((m) => m.id === id)).filter(Boolean) as MediaItem[],
    [myList, mediaItems],
  );

  const handlePlay = (item: MediaItem) => {
    if (item.videoUrl) {
      navigate({ to: "/watch/$mediaId", params: { mediaId: item.id } });
    }
  };

  const visibleRows = activeCategory
    ? browseRows.filter((r) => r.collectionId === activeCategory)
    : browseRows;

  const homeBody = loading ? (
    <>
      <Hero />
      <div className="-mt-28 relative z-20 pb-10 px-6 lg:px-12">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="shrink-0 h-8 w-24 rounded-full bg-muted animate-pulse" />
          ))}
        </div>
        <ContentRowSkeleton />
        <ContentRowSkeleton />
        <ContentRowSkeleton />
      </div>
      <TimeTogether />
      <DistanceBetween />
      <BirthdayCelebration />
      <StoryContinues />
    </>
  ) : (
    <>
      <Hero />

      <div className="-mt-16 sm:-mt-20 relative z-20 pb-8 sm:pb-10">
        {/* Category filter strip */}
        <div
          className="scroll-row-x px-4 sm:px-6 lg:px-12 mb-4 sm:mb-6 flex items-center gap-2 pb-1 pt-3 sm:pt-4"
          role="group"
          aria-label="Filter by category"
        >
          <button
            onClick={() => setActiveCategory(null)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border ${
              !activeCategory
                ? "bg-primary text-primary-foreground border-primary shadow-[var(--shadow-glow)]"
                : "bg-card/50 text-muted-foreground border-border/60 hover:border-primary/50 hover:text-foreground"
            }`}
            aria-pressed={!activeCategory}
          >
            All
          </button>
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground border-primary shadow-[var(--shadow-glow)]"
                  : "bg-card/50 text-muted-foreground border-border/60 hover:border-primary/50 hover:text-foreground"
              }`}
              aria-pressed={activeCategory === cat}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* My List Row */}
        {!activeCategory && myListItems.length > 0 && (
          <ContentRow title="My List" items={myListItems} onPlay={handlePlay} />
        )}

        {!activeCategory && <OnThisDay mediaItems={mediaItems} onPlay={handlePlay} />}

        {/* Dynamic rows — one per collection/category */}
        {visibleRows.map((row) => (
          <ContentRow
            key={row.collectionId}
            title={row.title}
            items={row.items}
            onPlay={handlePlay}
          />
        ))}

        {/* Voice Notes section */}
        {!activeCategory && voiceNotes.length > 0 && (
          <VoiceNoteRow title="Voice Notes" items={voiceNotes} />
        )}

        {/* API connection error — data may still exist in DB */}
        {apiError && !loading && (
          <div className="px-6 lg:px-12 py-12">
            <div className="max-w-lg mx-auto text-center rounded-xl border border-amber-500/40 bg-amber-500/10 px-6 py-8">
              <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-4" />
              <h3 className="font-display text-2xl mb-2">Can&apos;t load your memories</h3>
              <p className="text-sm text-muted-foreground mb-4">{apiError}</p>
              <p className="text-xs text-muted-foreground mb-6">
                Your uploads are usually still in PostgreSQL. Run{" "}
                <code className="text-foreground">npm run dev:api</code> in the backend folder, then
                refresh.
              </p>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  window.location.reload();
                }}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md text-sm font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {visibleRows.length === 0 && !loading && !apiError && (
          <div className="px-6 lg:px-12 py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-5">
              <Film className="h-10 w-10 text-muted-foreground/30" />
            </div>
            <h3 className="font-display text-3xl mb-3">No memories yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              {activeCategory
                ? `No memories in "${activeCategory}" yet. Upload some to get started.`
                : "Start building your memory collection by uploading photos and videos."}
            </p>
            <a
              href="/admin"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium hover:bg-primary/90 transition-colors shadow-[var(--shadow-glow)]"
            >
              <Upload className="h-4 w-4" /> Upload Memories
            </a>
          </div>
        )}
      </div>

      <TimeGreeting />
      <TimeTogether />
      <AnniversaryCountdown />
      <div id="mood-of-day">
        <MoodOfTheDay />
      </div>
      <div id="weather">
        <WeatherWidget />
      </div>
      <div id="first-times">
        <OurFirstTimes />
      </div>
      <div id="love-letters">
        <LoveLetterWall />
      </div>
      <div id="love-jar">
        <LoveJar />
      </div>
      <div id="mood-board">
        <MoodBoard />
      </div>
      <div id="playlist">
        <OurPlaylist />
      </div>
      <div id="canvas">
        <SharedCanvas />
      </div>
      <div id="bucket-list">
        <OurBucketList />
      </div>
      <div id="quiz">
        <RelationshipQuiz />
      </div>
      <div id="random-memory">
        <RandomMemory mediaItems={mediaItems} onPlay={handlePlay} />
      </div>
      <div id="distance">
        <DistanceBetween />
      </div>
      <BirthdayCelebration />
      <StoryContinues />

      {/* Inline video player fallback */}
      {playingItem && playingItem.videoUrl && (
        <VideoPlayer
          mediaId={playingItem.id}
          src={playingItem.videoUrl}
          title={playingItem.title}
          collectionName={playingItem.category}
          onClose={() => setPlayingItem(null)}
          onPlayNext={(nextId) => {
            const nextItem = mediaItems.find((m) => m.id === nextId);
            if (nextItem) setPlayingItem(nextItem);
          }}
        />
      )}
    </>
  );

  return <>{homeBody}</>;
}
