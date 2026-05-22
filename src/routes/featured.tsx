import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Play, ArrowRight, Film, ZoomIn } from "lucide-react";
import { type MediaItem } from "@/data/media";
import { getMediaUrl } from "@/lib/api";

export const Route = createFileRoute("/featured")({
  component: Featured,
  head: () => ({
    meta: [
      { title: "Featured Memories — USFLIX" },
      { name: "description", content: "The moments worth replaying again and again." },
    ],
  }),
});

function Featured() {
  const [featured, setFeatured] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await fetch("/api/media", { credentials: "include" });
        if (res.ok) {
          const data: MediaItem[] = await res.json();
          // Filter only featured items
          const featuredItems = data.filter(item => item.featured && item.status === "ready");
          setFeatured(featuredItems);
        }
      } catch (error) {
        console.error("Failed to fetch featured items:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  if (loading) {
    return (
      <div className="pt-24 pb-24">
        <div className="px-6 lg:px-12 max-w-[1400px] mx-auto mb-16">
          <p className="text-xs uppercase tracking-[0.4em] text-primary mb-3">Curated for you</p>
          <h1 className="font-display text-5xl md:text-6xl mb-3">Featured Memories</h1>
          <p className="text-muted-foreground text-lg max-w-xl">The moments worth replaying, again and again.</p>
        </div>
        <div className="space-y-0">
          {[1, 2, 3].map(i => (
            <div key={i} className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16">
              <div className="h-64 bg-muted animate-pulse rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (featured.length === 0) {
    return (
      <div className="pt-24 pb-24">
        <div className="px-6 lg:px-12 max-w-[1400px] mx-auto text-center py-24">
          <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-5">
            <Film className="h-10 w-10 text-muted-foreground/30" />
          </div>
          <h1 className="font-display text-4xl mb-3">No Featured Memories Yet</h1>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Mark your favorite memories as featured in the admin panel to showcase them here.
          </p>
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium hover:bg-primary/90 transition-colors shadow-[var(--shadow-glow)]"
          >
            Go to Admin Panel
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-24">
      {/* Page hero */}
      <div className="px-6 lg:px-12 max-w-[1400px] mx-auto mb-16">
        <p className="text-xs uppercase tracking-[0.4em] text-primary mb-3">Curated for you</p>
        <h1 className="font-display text-5xl md:text-6xl mb-3">Featured Memories</h1>
        <p className="text-muted-foreground text-lg max-w-xl">The moments worth replaying, again and again.</p>
      </div>

      {/* Featured items */}
      <div className="space-y-0">
        {featured.map((item, i) => (
          <div
            key={item.id}
            className={`relative group overflow-hidden ${i % 2 === 0 ? "" : "bg-card/20"}`}
          >
            <div className={`max-w-[1400px] mx-auto px-6 lg:px-12 py-16 md:py-20 grid md:grid-cols-2 gap-10 lg:gap-16 items-center ${i % 2 ? "md:grid-flow-dense" : ""}`}>
              {/* Image */}
              <div className={`overflow-hidden rounded-xl shadow-[var(--shadow-card)] ${i % 2 ? "md:col-start-2" : ""}`}>
                <Link 
                  to={item.type === "video" ? "/watch/$mediaId" : "/albums/$albumId"} 
                  params={{ [item.type === "video" ? "mediaId" : "albumId"]: item.id }} 
                  className="block relative group/img"
                >
                  {item.thumbnail ? (
                    <img
                      src={getMediaUrl(item.thumbnail)}
                      alt={item.title}
                      loading="lazy"
                      className="w-full aspect-[4/3] object-cover transition-transform duration-700 group-hover/img:scale-105"
                    />
                  ) : (
                    <div className="w-full aspect-[4/3] bg-muted flex items-center justify-center">
                      <Film className="h-16 w-16 text-muted-foreground/30" />
                    </div>
                  )}
                  {/* Overlay icon */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-primary/90 rounded-full p-4 shadow-[var(--shadow-glow)]">
                      {item.type === "video" ? (
                        <Play className="h-8 w-8 fill-primary-foreground text-primary-foreground" />
                      ) : (
                        <ZoomIn className="h-8 w-8 text-primary-foreground" />
                      )}
                    </div>
                  </div>
                </Link>
              </div>

              {/* Text */}
              <div className={i % 2 ? "md:col-start-1 md:row-start-1" : ""}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="font-display text-6xl text-primary/20 leading-none select-none">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.4em] text-primary">{item.category}</p>
                    <p className="text-xs text-muted-foreground">{item.year}</p>
                  </div>
                </div>

                <Link 
                  to={item.type === "video" ? "/watch/$mediaId" : "/albums/$albumId"} 
                  params={{ [item.type === "video" ? "mediaId" : "albumId"]: item.id }}
                >
                  <h2 className="font-display text-4xl md:text-5xl mb-4 hover:text-primary transition-colors duration-300 leading-tight">
                    {item.title}
                  </h2>
                </Link>

                <p className="font-display italic text-xl text-foreground/80 mb-4 leading-snug">
                  "{item.tagline}"
                </p>
                <p className="text-muted-foreground leading-relaxed mb-8">{item.description}</p>

                <div className="flex flex-wrap gap-3">
                  <Link
                    to={item.type === "video" ? "/watch/$mediaId" : "/albums/$albumId"} 
                    params={{ [item.type === "video" ? "mediaId" : "albumId"]: item.id }}
                    className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[var(--shadow-glow)]"
                  >
                    {item.type === "video" ? (
                      <>
                        <Play className="h-4 w-4 fill-current" /> Watch Now
                      </>
                    ) : (
                      <>
                        <ZoomIn className="h-4 w-4" /> View Album
                      </>
                    )}
                  </Link>
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground border border-border/50 px-4 py-3 rounded-md">
                    {item.type === "video" 
                      ? `${Math.floor((item.duration || 0) / 60)}:${String(Math.floor((item.duration || 0) % 60)).padStart(2, '0')}`
                      : `${item.photos?.length || 0} photos`
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Divider */}
            {i < featured.length - 1 && (
              <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
                <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Browse all CTA */}
      <div className="mt-20 text-center px-6">
        <p className="text-muted-foreground mb-4">Want to see everything?</p>
        <Link
          to="/albums"
          className="inline-flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all"
        >
          Browse all albums <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
