import { cn } from "@/lib/utils";

// ─── Base Skeleton (shadcn compatible) ───────────────────────────────────────
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

// ─── Media card skeleton ──────────────────────────────────────────────────────
function MediaCardSkeleton() {
  return (
    <div className="snap-start shrink-0 w-[42vw] max-w-[168px] sm:w-[200px] sm:max-w-none md:w-[260px] lg:w-[290px] aspect-[2/3] rounded-lg overflow-hidden">
      <Skeleton className="w-full h-full" />
    </div>
  );
}

// ─── Content row skeleton ─────────────────────────────────────────────────────
function ContentRowSkeleton() {
  return (
    <section className="py-4 sm:py-6">
      <div className="px-4 sm:px-6 lg:px-16 mb-3 sm:mb-4">
        <Skeleton className="h-7 sm:h-8 w-40 sm:w-48" />
      </div>
      <div className="scroll-row-x flex gap-2 sm:gap-3 px-4 sm:px-6 lg:px-16">
        {Array.from({ length: 5 }).map((_, i) => (
          <MediaCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

// ─── Hero skeleton ────────────────────────────────────────────────────────────
function HeroSkeleton() {
  return (
    <section className="relative h-[96vh] min-h-[640px] w-full overflow-hidden bg-muted">
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted via-muted/80 to-muted" />
      <div className="relative z-10 h-full flex items-end pb-28 md:pb-36 px-6 lg:px-12">
        <div className="max-w-2xl space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-16 w-96" />
          <Skeleton className="h-6 w-full max-w-xl" />
          <div className="flex gap-3 pt-4">
            <Skeleton className="h-12 w-32" />
            <Skeleton className="h-12 w-32" />
          </div>
        </div>
      </div>
    </section>
  );
}

export { Skeleton, MediaCardSkeleton, ContentRowSkeleton, HeroSkeleton };
