"use client";

import { MonthPageFilter } from "@/components/layout/month-page-filter";
import { cn } from "@/lib/utils";

/** Month, net, and quick jump on every dashboard page (replaces the old mobile header strip). */
export function DesktopMonthBar({ className }: { className?: string }) {
  return (
    <div className={cn("mb-4 w-full min-w-0 sm:mb-5", className)}>
      <MonthPageFilter />
    </div>
  );
}
