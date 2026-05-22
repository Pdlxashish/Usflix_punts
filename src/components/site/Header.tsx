import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Heart,
  Search,
  Menu,
  X,
  Settings,
  Sun,
  Moon,
  ChevronDown,
  Film,
  BookOpen,
  Sparkles,
  Music,
  MapPin,
  Smile,
  Star,
  Palette,
  Cloud,
  ListChecks,
  HelpCircle,
  Shuffle,
  Mail,
  Gift,
  LayoutGrid,
} from "lucide-react";
import { useEffect, useState, useRef, useMemo } from "react";
import { useLenis } from "lenis/react";
import { useLenisLock } from "@/components/scroll/SmoothScroll";
import { useBranding } from "@/context/branding";
import { useContent } from "@/context/content";
import { HighlightText } from "@/components/site/MediaCard";
import { formatDuration } from "@/data/media";
import { useTheme } from "@/components/ui/ThemeToggle";

// ─── Nav structure ────────────────────────────────────────────────────────────
interface NavItem {
  label: string;
  to: string;
  exact?: boolean;
  icon?: React.ReactNode;
  hash?: string;
}

interface NavCategory {
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
}

const navCategories: NavCategory[] = [
  {
    label: "Memories",
    icon: <Film className="h-4 w-4" />,
    items: [
      { label: "Home", to: "/", exact: true, icon: <LayoutGrid className="h-3.5 w-3.5" /> },
      { label: "Albums", to: "/albums", icon: <BookOpen className="h-3.5 w-3.5" /> },
      { label: "Featured", to: "/featured", icon: <Star className="h-3.5 w-3.5" /> },
    ],
  },
  {
    label: "Us",
    icon: <Heart className="h-4 w-4" />,
    items: [
      { label: "Love Letters", to: "/", hash: "love-letters", icon: <Mail className="h-3.5 w-3.5" /> },
      { label: "Love Jar", to: "/", hash: "love-jar", icon: <Gift className="h-3.5 w-3.5" /> },
      { label: "Our Playlist", to: "/", hash: "playlist", icon: <Music className="h-3.5 w-3.5" /> },
      { label: "Bucket List", to: "/", hash: "bucket-list", icon: <ListChecks className="h-3.5 w-3.5" /> },
      { label: "First Times", to: "/", hash: "first-times", icon: <Sparkles className="h-3.5 w-3.5" /> },
    ],
  },
  {
    label: "Today",
    icon: <Smile className="h-4 w-4" />,
    items: [
      { label: "Mood of the Day", to: "/", hash: "mood-of-day", icon: <Smile className="h-3.5 w-3.5" /> },
      { label: "Weather", to: "/", hash: "weather", icon: <Cloud className="h-3.5 w-3.5" /> },
      { label: "Distance", to: "/", hash: "distance", icon: <MapPin className="h-3.5 w-3.5" /> },
      { label: "Random Memory", to: "/", hash: "random-memory", icon: <Shuffle className="h-3.5 w-3.5" /> },
    ],
  },
  {
    label: "Create",
    icon: <Palette className="h-4 w-4" />,
    items: [
      { label: "Canvas", to: "/", hash: "canvas", icon: <Palette className="h-3.5 w-3.5" /> },
      { label: "Mood Board", to: "/", hash: "mood-board", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
      { label: "Quiz", to: "/", hash: "quiz", icon: <HelpCircle className="h-3.5 w-3.5" /> },
    ],
  },
];

// Flat list for mobile (all items)
const allNavItems: (NavItem & { category: string })[] = navCategories.flatMap((cat) =>
  cat.items.map((item) => ({ ...item, category: cat.label }))
);

// ─── Scroll-to-section helper ─────────────────────────────────────────────────
function scrollToHash(hash: string) {
  const el = document.getElementById(hash);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// ─── Desktop dropdown ─────────────────────────────────────────────────────────
function NavDropdown({
  category,
  navigate,
  closeAll,
}: {
  category: NavCategory;
  navigate: ReturnType<typeof useNavigate>;
  closeAll: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const routerState = useRouterState();
  const isHome = routerState.location.pathname === "/";

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleItemClick = (item: NavItem) => {
    setOpen(false);
    closeAll();
    if (item.hash) {
      if (isHome) {
        scrollToHash(item.hash);
      } else {
        // Navigate to home then scroll after a short delay
        navigate({ to: "/" as any }).then(() => {
          setTimeout(() => scrollToHash(item.hash!), 400);
        });
      }
    } else {
      navigate({ to: item.to as any });
    }
  };

  // Check if any item in this category is "active"
  const isActive = category.items.some(
    (item) => !item.hash && routerState.location.pathname === item.to
  );

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 text-sm py-1 transition-colors group ${
          isActive ? "text-primary" : "text-foreground/80 hover:text-primary"
        }`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {category.label}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
        <span className="absolute bottom-0 left-0 h-px w-0 bg-primary transition-all duration-300 group-hover:w-full" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-52 bg-card/95 backdrop-blur-md border border-border/60 rounded-xl shadow-[var(--shadow-card)] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-1.5">
            <p className="px-3 py-1.5 text-[10px] uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-1.5">
              {category.icon} {category.label}
            </p>
            {category.items.map((item) => (
              <button
                key={`${item.to}-${item.hash ?? ""}`}
                onClick={() => handleItemClick(item)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <span className="text-muted-foreground">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const routerState = useRouterState();
  const navigate = useNavigate();
  const { branding } = useBranding();
  const { mediaItems } = useContent();
  const searchRef = useRef<HTMLDivElement>(null);
  const { actualTheme, setTheme } = useTheme();

  // "/" keyboard shortcut to open search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !searchOpen &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  useLenis((lenis) => {
    setScrolled(lenis.scroll > 40);
  });

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    setSearchQuery("");
    setOpenCategory(null);
  }, [routerState.location.pathname]);

  useLenisLock(menuOpen);

  // Note: Lenis lock above handles scroll prevention; no need to also set body.style.overflow

  // Debounce search ~300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close search on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const searchResults = useMemo(() => {
    if (debouncedQuery.length < 2) return [];
    const q = debouncedQuery.toLowerCase();
    return mediaItems
      .filter(
        (m) =>
          m.status === "ready" &&
          (m.title.toLowerCase().includes(q) || m.category.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [debouncedQuery, mediaItems]);

  const showResults = searchOpen && debouncedQuery.length >= 2;

  const handleMobileItemClick = (item: NavItem) => {
    setMenuOpen(false);
    if (item.hash) {
      const isHome = routerState.location.pathname === "/";
      if (isHome) {
        scrollToHash(item.hash);
      } else {
        navigate({ to: "/" as any }).then(() => {
          setTimeout(() => scrollToHash(item.hash!), 400);
        });
      }
    } else {
      navigate({ to: item.to as any });
    }
  };

  return (
    <>
      <header
        data-heart-rainfall-pass
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 motion-reduce:transition-none ${
          scrolled || menuOpen
            ? "bg-background/95 backdrop-blur-md border-b border-border/50 shadow-[0_4px_30px_oklch(0_0_0/0.3)]"
            : "bg-gradient-to-b from-background/80 to-transparent"
        }`}
      >
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-12 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            {branding.logoUrl ? (
              <img
                src={
                  branding.logoUrl.startsWith("http")
                    ? branding.logoUrl
                    : `/api${branding.logoUrl}`
                }
                alt={branding.platformName}
                className="h-8 w-auto object-contain group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <>
                <Heart className="h-5 w-5 text-primary fill-primary group-hover:scale-125 transition-transform duration-300 motion-reduce:transition-none" />
                <span className="font-display text-xl tracking-tight text-primary">
                  {branding.platformName}
                </span>
              </>
            )}
          </Link>

          {/* Desktop nav — categorized dropdowns */}
          <nav
            className="hidden md:flex items-center gap-6 text-sm"
            aria-label="Main navigation"
          >
            {navCategories.map((cat) => (
              <NavDropdown
                key={cat.label}
                category={cat}
                navigate={navigate}
                closeAll={() => setOpenCategory(null)}
              />
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Expandable search (desktop) */}
            <div
              ref={searchRef}
              className={`hidden md:flex items-center relative transition-all duration-300 motion-reduce:transition-none overflow-visible ${
                searchOpen ? "w-64" : "w-8"
              }`}
            >
              {searchOpen && (
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search memories…"
                  className="w-full bg-card/80 border border-border rounded-md px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  onKeyDown={(e) => e.key === "Escape" && setSearchOpen(false)}
                  aria-label="Search memories"
                />
              )}
              <button
                onClick={() => setSearchOpen((v) => !v)}
                className="shrink-0 ml-1 text-foreground/80 hover:text-primary transition-colors"
                aria-label={searchOpen ? "Close search" : "Open search"}
              >
                {searchOpen ? <X className="h-4 w-4" /> : <Search className="h-5 w-5" />}
              </button>

              {/* Search results dropdown */}
              {showResults && (
                <div className="absolute top-10 left-0 right-0 bg-card/95 backdrop-blur-md border border-border rounded-lg shadow-[var(--shadow-card)] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {searchResults.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-muted-foreground text-center">
                      No results found
                    </p>
                  ) : (
                    <div className="max-h-80 overflow-y-auto">
                      {searchResults.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            if (item.type === "video")
                              navigate({ to: "/watch/$mediaId", params: { mediaId: item.id } });
                            else navigate({ to: "/albums" });
                            setSearchOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-primary/10 transition-colors border-b border-border/30 last:border-0"
                        >
                          {item.thumbnail ? (
                            <img
                              src={item.thumbnail}
                              alt=""
                              className="w-8 h-11 rounded object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-11 rounded bg-muted shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              <HighlightText text={item.title} query={debouncedQuery} />
                            </p>
                            <p className="text-xs text-muted-foreground">
                              <HighlightText text={item.category} query={debouncedQuery} />
                              {item.type === "video" &&
                                item.duration != null &&
                                ` · ${formatDuration(item.duration)}`}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Theme toggle */}
            <button
              onClick={() => setTheme(actualTheme === "dark" ? "light" : "dark")}
              className="flex items-center justify-center w-8 h-8 rounded-full text-foreground/60 hover:text-primary transition-colors"
              aria-label={`Switch to ${actualTheme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${actualTheme === "dark" ? "light" : "dark"} mode`}
            >
              {actualTheme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>

            {/* Admin link (desktop) */}
            <Link
              to="/admin"
              className="hidden md:flex items-center justify-center w-8 h-8 rounded-full text-foreground/60 hover:text-primary transition-colors"
              aria-label="Admin panel"
              title="Admin panel"
            >
              <Settings className="h-4 w-4" />
            </Link>

            {/* Mobile search */}
            <button
              className="md:hidden text-foreground/80 hover:text-primary transition-colors"
              aria-label="Search"
              onClick={() => setSearchOpen((v) => !v)}
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Mobile hamburger */}
            <button
              className="md:hidden text-foreground/80 hover:text-primary transition-colors"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile search bar */}
        {searchOpen && (
          <div className="md:hidden px-4 sm:px-6 pb-3 animate-in slide-in-from-top-2 duration-200 motion-reduce:animate-none">
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memories…"
              className="w-full bg-card/80 border border-border rounded-md px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              onKeyDown={(e) => e.key === "Escape" && setSearchOpen(false)}
              aria-label="Search memories"
            />
            {showResults && searchResults.length > 0 && (
              <div className="mt-2 bg-card/95 border border-border rounded-lg overflow-hidden shadow-[var(--shadow-card)]">
                {searchResults.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.type === "video")
                        navigate({ to: "/watch/$mediaId", params: { mediaId: item.id } });
                      else navigate({ to: "/albums" });
                      setSearchOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-primary/10 transition-colors border-b border-border/30 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        <HighlightText text={item.title} query={debouncedQuery} />
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <HighlightText text={item.category} query={debouncedQuery} />
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      {/* ── Mobile menu overlay ── */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-background/95 backdrop-blur-md"
            onClick={() => setMenuOpen(false)}
          />
          <nav
            className="absolute top-16 inset-x-0 bottom-0 overflow-y-auto px-4 sm:px-6 py-6 flex flex-col gap-1 animate-in slide-in-from-top-4 duration-300 motion-reduce:animate-none"
            aria-label="Mobile navigation"
          >
            {navCategories.map((cat, catIdx) => (
              <div key={cat.label} className="mb-2">
                {/* Category header */}
                <button
                  onClick={() =>
                    setOpenCategory((prev) => (prev === cat.label ? null : cat.label))
                  }
                  className="w-full flex items-center justify-between py-3 border-b border-border/30"
                  style={{ animationDelay: `${catIdx * 50}ms` }}
                >
                  <span className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-[0.3em]">
                    {cat.icon} {cat.label}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                      openCategory === cat.label ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Category items */}
                {openCategory === cat.label && (
                  <div className="mt-1 flex flex-col gap-0.5 animate-in slide-in-from-top-2 duration-200">
                    {cat.items.map((item) => (
                      <button
                        key={`${item.to}-${item.hash ?? ""}`}
                        onClick={() => handleMobileItemClick(item)}
                        className="flex items-center gap-3 px-3 py-3 rounded-lg text-left text-foreground/80 hover:text-primary hover:bg-primary/10 transition-colors"
                      >
                        <span className="text-muted-foreground">{item.icon}</span>
                        <span className="font-medium text-base">{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Admin + theme at bottom */}
            <div className="mt-4 pt-4 border-t border-border/30 flex flex-col gap-1">
              <Link
                to="/admin"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span className="font-medium text-base">Admin</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setTheme(actualTheme === "dark" ? "light" : "dark");
                  setMenuOpen(false);
                }}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors"
              >
                {actualTheme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
                <span className="font-medium text-base">
                  {actualTheme === "dark" ? "Light mode" : "Dark mode"}
                </span>
              </button>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
