"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function ProjectJobCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <Card className="overflow-hidden border-border/50 bg-card/80 shadow-sm">
      <CardContent className={cn("space-y-2.5", compact ? "p-2.5" : "p-3")}>
        <div className="flex items-start gap-2">
          <Skeleton className="mt-1 size-4 shrink-0 rounded" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-[78%]" />
                <Skeleton className="h-3 w-[55%]" />
              </div>
              <Skeleton className="size-7 shrink-0 rounded-md" />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
        <div className="flex items-end justify-between gap-2">
          <div className="space-y-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
      </CardContent>
    </Card>
  );
}

export function ProjectJobsTotalsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="border-border/70 shadow-sm">
          <CardHeader className="space-y-2 p-3 pb-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-24" />
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

export function ProjectJobsListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <ProjectJobCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProjectJobsKanbanSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, col) => (
        <div key={col} className="rounded-2xl border border-border/60 bg-muted/10 p-2">
          <div className="mb-2 flex items-center justify-between px-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-6 rounded-full" />
          </div>
          <div className="space-y-2">
            <ProjectJobCardSkeleton compact />
            <ProjectJobCardSkeleton compact />
          </div>
        </div>
      ))}
    </div>
  );
}
