/**
 * Our Playlist — Display songs with Spotify/YouTube embeds
 * Shows "Our Song" and "Song of the Day" highlights
 */
import { useEffect, useState } from "react";
import { Music, Heart, Sparkles, ExternalLink } from "lucide-react";
import { fetchApiJson } from "@/lib/fetchApi";

interface Song {
  id: string;
  title: string;
  artist: string;
  spotifyUrl: string | null;
  youtubeUrl: string | null;
  memoryNote: string;
  isOurSong: boolean;
  isSongOfDay: boolean;
  sortRank: number;
}

function extractSpotifyId(url: string): string | null {
  const match = url.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function SongCard({ song }: { song: Song }) {
  const spotifyId = song.spotifyUrl ? extractSpotifyId(song.spotifyUrl) : null;
  const youtubeId = song.youtubeUrl ? extractYouTubeId(song.youtubeUrl) : null;

  return (
    <div
      className={`relative bg-card/60 border rounded-xl p-5 transition-all hover:shadow-[var(--shadow-glow)] ${
        song.isOurSong
          ? "border-primary/60 shadow-[0_0_20px_oklch(0.5_0.2_22/0.3)]"
          : song.isSongOfDay
          ? "border-accent/60"
          : "border-border/40"
      }`}
    >
      {/* Badge */}
      {song.isOurSong && (
        <div className="absolute -top-3 left-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-lg">
          <Heart className="h-3 w-3 fill-current" /> Our Song
        </div>
      )}
      {song.isSongOfDay && !song.isOurSong && (
        <div className="absolute -top-3 left-4 bg-accent text-accent-foreground px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-lg">
          <Sparkles className="h-3 w-3" /> Song of the Day
        </div>
      )}

      {/* Song info */}
      <div className="mb-4">
        <h3 className="font-display text-xl mb-1">{song.title}</h3>
        {song.artist && (
          <p className="text-sm text-muted-foreground">{song.artist}</p>
        )}
      </div>

      {/* Memory note */}
      {song.memoryNote && (
        <p className="text-sm italic text-muted-foreground mb-4 border-l-2 border-primary/40 pl-3">
          "{song.memoryNote}"
        </p>
      )}

      {/* Embeds */}
      <div className="space-y-3">
        {spotifyId && (
          <div className="rounded-lg overflow-hidden">
            <iframe
              src={`https://open.spotify.com/embed/track/${spotifyId}?utm_source=generator&theme=0`}
              width="100%"
              height="152"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title={`Spotify: ${song.title}`}
            />
          </div>
        )}
        {youtubeId && (
          <div className="aspect-video rounded-lg overflow-hidden">
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}`}
              width="100%"
              height="100%"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
              title={`YouTube: ${song.title}`}
            />
          </div>
        )}
        {!spotifyId && !youtubeId && (
          <div className="flex gap-2">
            {song.spotifyUrl && (
              <a
                href={song.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" /> Open in Spotify
              </a>
            )}
            {song.youtubeUrl && (
              <a
                href={song.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" /> Open in YouTube
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function OurPlaylist() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApiJson<Song[]>("/playlist")
      .then((data) => {
        setSongs(data);
        setError(null);
      })
      .catch((err) => {
        setSongs([]);
        setError(err instanceof Error ? err.message : "Could not load playlist");
      })
      .finally(() => setLoading(false));
  }, []);

  // Only hide if no error and no songs (genuinely empty)
  if (!loading && songs.length === 0 && !error) return null;

  return (
    <section className="relative py-24 px-6 lg:px-12 overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 60%, oklch(0.2 0.07 22 / 0.4) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-5xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="h-px w-8 bg-primary" />
            <p className="text-xs uppercase tracking-[0.4em] text-primary flex items-center gap-2">
              <Music className="h-3.5 w-3.5" /> {error ? "Playlist" : `${songs.length} songs`}
            </p>
            <span className="h-px w-8 bg-primary" />
          </div>
          <h2 className="font-display text-5xl md:text-6xl">
            Our <span className="text-primary italic">Playlist</span>
          </h2>
          <p className="text-muted-foreground mt-4">
            Songs that remind us of each other and our journey together
          </p>
        </div>

        {/* Songs grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-64 rounded-xl bg-card/40 animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12 text-muted-foreground">
            <Music className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Playlist unavailable — start the backend server to load songs.</p>
            <p className="text-xs mt-1 opacity-60">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {songs.map((song) => (
              <SongCard key={song.id} song={song} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
