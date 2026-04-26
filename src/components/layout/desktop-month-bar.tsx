"use client";

import { usePathname } from "@/i18n/navigation";
import { MonthPageFilter } from "@/components/layout/month-page-filter";
import { cn } from "@/lib/utils";

/**
 * Report-only: month filter + that month’s net. Other pages use the ledger / all-time lists.
 */
export function DesktopMonthBar({ className }: { className?: string }) {
  const path = usePathname();
  if (path !== "/report") {
    return null;
  }
  return (
    <div className={cn("mb-4 w-full min-w-0 sm:mb-5", className)}>
      <MonthPageFilter />
    </div>
  );
}
