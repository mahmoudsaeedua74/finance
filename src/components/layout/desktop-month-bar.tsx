"use client";

import { useTranslations } from "next-intl";
import { MonthCompact } from "@/components/layout/month-compact";
import { cn } from "@/lib/utils";

/** Month navigation in the main column on md+; mobile uses the header MonthCompact. */
export function DesktopMonthBar({ className }: { className?: string }) {
  const t = useTranslations("layout");
  return (
    <div
      className={cn(
        "mb-5 hidden w-full min-w-0 border-b border-border/50 pb-4 md:block",
        className
      )}
      role="region"
      aria-label={t("monthOverview")}
    >
      <MonthCompact className="max-w-md justify-start" />
    </div>
  );
}
