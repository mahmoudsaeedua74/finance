import { Skeleton } from "@/components/ui/skeleton";

export function AuthRouteSkeleton() {
  return (
    <div
      className="w-full max-w-sm space-y-5"
      role="status"
      aria-label="Loading page"
    >
      <span className="sr-only">Loading</span>
      <div className="space-y-2 text-center">
        <Skeleton className="mx-auto h-7 w-36 rounded-lg" />
        <Skeleton className="mx-auto h-4 w-52" />
      </div>
      <div className="space-y-4 rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
        <Skeleton className="h-11 w-full rounded-xl" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-4 flex-1" />
        </div>
      </div>
    </div>
  );
}
