import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useBranding } from "@/context/branding";

const cols = [
  {
    title: "Explore",
    links: [
      { label: "Home", to: "/" },
      { label: "Albums", to: "/albums" },
      { label: "Featured", to: "/featured" },
      { label: "Upload", to: "/upload" },
    ],
  },
  {
    title: "Categories",
    links: [
      { label: "Romance", to: "/albums" },
      { label: "Travel", to: "/albums" },
      { label: "Celebrations", to: "/albums" },
      { label: "Daily Life", to: "/albums" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "My Favorites", to: "/featured" },
      { label: "Watch Later", to: "/featured" },
      { label: "Settings", to: "/upload" },
    ],
  },
  {
    title: "Connect",
    links: [
      { label: "Share Love", to: "/upload" },
      { label: "Gift Ideas", to: "/featured" },
      { label: "Anniversaries", to: "/albums" },
    ],
  },
];

export function Footer() {
  const { branding } = useBranding();

  return (
    <footer className="border-t border-border/50 mt-10 pt-16 pb-10 px-6 lg:px-12 bg-background">
      <div className="mx-auto max-w-[1600px]">
        <Link to="/" className="inline-flex items-center gap-2 group">
          <Heart className="h-6 w-6 text-primary fill-primary" />
          <span className="font-display text-2xl tracking-tight text-primary">{branding.platformName}</span>
        </Link>

        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-10">
          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="font-display text-lg text-foreground mb-4">{c.title}</h4>
              <ul className="space-y-3">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-6 border-t border-border/40 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            Made with <Heart className="h-4 w-4 fill-primary text-primary" /> for the love of our lives.
          </p>
          <p className="font-display text-primary">{branding.footerText}</p>
        </div>
      </div>
    </footer>
  );
}
