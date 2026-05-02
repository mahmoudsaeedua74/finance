import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown in `(dashboard)/loading` while a route segment streams / chunk loads.
 * Shapes are aligned with the dashboard home (header + stat cards + chart + list).
 */
export function DashboardRouteSkeleton() {
  return (
    <div
      className="min-w-0 max-w-6xl space-y-4 sm:space-y-6"
      role="status"
      aria-label="Loading page"
    >
      <span className="sr-only">Loading</span>

      <div className="flex flex-col gap-3 min-[500px]:flex-row min-[500px]:items-end min-[500px]:justify-between">
        <div className="flex min-w-0 gap-3 min-[500px]:max-w-xl">
          <Skeleton className="mt-0.5 h-10 w-10 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1 space-y-2.5">
            <Skeleton className="h-7 w-[12rem] min-[400px]:h-8 min-[400px]:w-[16rem]" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
        </div>
        <div className="hidden min-[500px]:flex shrink-0 gap-2">
          <Skeleton className="h-10 w-[6.5rem] rounded-md" />
          <Skeleton className="h-10 w-[6.5rem] rounded-md" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 min-[500px]:grid-cols-3 sm:gap-4">
        <Skeleton className="h-28 rounded-2xl border border-border/40 sm:h-32" />
        <Skeleton className="h-28 rounded-2xl border border-border/40 sm:h-32" />
        <Skeleton className="h-28 rounded-2xl border border-border/40 sm:h-32" />
      </div>

      <Skeleton className="h-24 w-full max-w-4xl rounded-2xl border border-border/40" />

      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-56 w-full rounded-2xl border border-border/40" />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-card/40 p-4 sm:p-5">
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-72 max-w-full" />
        </div>
        <div className="space-y-2 pt-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 border-b border-border/30 pb-2 last:border-0">
              <Skeleton className="h-4 w-24 shrink-0" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
