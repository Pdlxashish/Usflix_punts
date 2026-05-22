import { Link } from "@tanstack/react-router";
import { Heart, Play, Camera, Sparkles } from "lucide-react";
import { useContent } from "@/context/content";
import { useMemo } from "react";
import { LoveBombHeart } from "@/components/site/LoveBombHeart";

export function StoryContinues() {
  const { collections, mediaItems } = useContent();

  // Calculate dynamic statistics
  const stats = useMemo(() => {
    const albumCount = collections.length;
    const photoCount = mediaItems.filter(item => item.type === 'photo').length;
    const videoCount = mediaItems.filter(item => item.type === 'video').length;
    const totalMedia = mediaItems.length;

    return {
      albums: albumCount,
      photos: photoCount,
      videos: videoCount,
      total: totalMedia,
    };
  }, [collections, mediaItems]);

  const highlights = [
    { 
      icon: Heart, 
      label: `${stats.albums} Album${stats.albums !== 1 ? 's' : ''}`, 
      sub: "and growing" 
    },
    { 
      icon: Camera, 
      label: `${stats.photos}+ Photo${stats.photos !== 1 ? 's' : ''}`, 
      sub: "captured forever" 
    },
    { 
      icon: Sparkles, 
      label: stats.videos > 0 ? `${stats.videos} Video${stats.videos !== 1 ? 's' : ''}` : "Every Moment", 
      sub: stats.videos > 0 ? "to relive" : "worth remembering" 
    },
  ];

  return (
    <section className="relative py-16 md:py-32 px-6 lg:px-12 overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 50% 50%, oklch(0.22 0.09 22 / 0.55) 0%, transparent 70%)",
        }}
      />
      {/* Decorative lines */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-gradient-to-b from-transparent via-primary/10 to-transparent" />
      </div>

      <div className="max-w-4xl mx-auto text-center">
        {/* Love bomb — 5 clicks → slow crack → hearts scatter across the homepage */}
        <LoveBombHeart />

        {/* Heading */}
        <h2 className="font-display text-5xl md:text-6xl lg:text-7xl mt-8 leading-tight">
          Our Story<br />
          <span className="text-primary italic">Continues</span>
          <span className="text-primary">…</span>
        </h2>

        <p className="text-muted-foreground mt-6 text-lg max-w-2xl mx-auto leading-relaxed">
          Every day brings new moments to treasure, new adventures to share, and
          new reasons to fall in love all over again.
        </p>

        {/* Highlights */}
        <div className="mt-12 flex flex-wrap justify-center gap-6">
          {highlights.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-3 bg-card/50 border border-border/50 rounded-full px-5 py-2.5 backdrop-blur">
              <Icon className="h-4 w-4 text-primary" />
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-[11px] text-muted-foreground">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="mt-12 flex flex-wrap justify-center gap-4">
          <Link
            to="/featured"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-md font-medium hover:bg-primary/90 hover:scale-[1.03] active:scale-[0.98] transition-all shadow-[var(--shadow-glow)]"
          >
            <Play className="h-5 w-5 fill-current" /> Watch Our Story
          </Link>
          <Link
            to="/albums"
            className="inline-flex items-center gap-2 bg-foreground/10 border border-foreground/20 text-foreground px-8 py-4 rounded-md font-medium hover:bg-foreground/20 hover:scale-[1.03] active:scale-[0.98] transition-all backdrop-blur"
          >
            <Camera className="h-5 w-5" /> Browse Memories
          </Link>
        </div>
      </div>
    </section>
  );
}
