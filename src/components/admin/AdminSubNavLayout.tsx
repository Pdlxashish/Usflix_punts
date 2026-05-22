import { type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type AdminNavSection<T extends string> = {
  id: T;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  description: string;
};

type AdminSubNavLayoutProps<T extends string> = {
  sections: AdminNavSection<T>[];
  active: T;
  onSelect: (id: T) => void;
  navLabel?: string;
  /** Rendered at the bottom of the content area (e.g. Save / Reset) */
  footer?: ReactNode;
  children: ReactNode;
};

export function AdminSubNavLayout<T extends string>({
  sections,
  active,
  onSelect,
  navLabel = "Sections",
  footer,
  children,
}: AdminSubNavLayoutProps<T>) {
  const meta = sections.find((s) => s.id === active)!;

  return (
    <div className="space-y-4 sm:space-y-5 min-w-0">
      <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,12.5rem)_minmax(0,1fr)] lg:gap-6 xl:gap-8 gap-4">
        <aside className="lg:sticky lg:top-24 lg:self-start w-full min-w-0 shrink-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-0.5">
            {navLabel}
          </p>
          <nav
            className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible scrollbar-hide pb-1 lg:pb-0"
            aria-label={navLabel}
          >
            {sections.map((s) => {
              const Icon = s.icon;
              const isActive = active === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelect(s.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-all whitespace-nowrap shrink-0 lg:shrink lg:w-full ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                      : "text-muted-foreground hover:text-foreground hover:bg-card/80 border border-transparent lg:border-border/40"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="lg:hidden">{s.shortLabel}</span>
                  <span className="hidden lg:inline truncate">{s.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 space-y-4 overflow-hidden">
          <div className="flex items-start gap-3 pb-2 border-b border-border/40 min-w-0">
            <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <meta.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-lg sm:text-2xl break-words">{meta.label}</h2>
              <p className="text-sm text-muted-foreground mt-0.5 break-words">{meta.description}</p>
            </div>
          </div>
          <div className="min-w-0 space-y-4">{children}</div>
          {footer && <div className="min-w-0 pt-2">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

export function AdminSectionCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="bg-card/50 border border-border/60 rounded-xl p-4 sm:p-6 space-y-4 min-w-0 overflow-hidden">
      <div className="min-w-0">
        <h3 className="font-display text-base sm:text-lg break-words">{title}</h3>
        {description && <p className="text-sm text-muted-foreground mt-1 break-words">{description}</p>}
      </div>
      <div className="min-w-0 space-y-4">{children}</div>
    </div>
  );
}

/** Bottom action bar for save / reset controls */
export function AdminFormActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 p-4 rounded-xl border border-border/60 bg-card/90 shadow-[var(--shadow-card)]">
      {children}
    </div>
  );
}
