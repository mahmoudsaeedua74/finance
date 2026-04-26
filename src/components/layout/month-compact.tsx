"use client";

import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMonth } from "@/context/month-context";
import { shortMonthLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Tappable prev/next + short month for sticky mobile header. Min 44px hit targets.
 */
export function MonthCompact({ className }: { className?: string }) {
  const t = useTranslations("month");
  const locale = useLocale();
  const { year, month, nextMonth, prevMonth } = useMonth();
  const short = shortMonthLabel(year, month, locale);
  return (
    <div
      className={cn(
        "mx-auto flex w-full min-w-0 max-w-md items-center justify-center gap-0.5 sm:gap-1",
        className
      )}
      dir="ltr"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11 shrink-0 touch-manipulation sm:size-9"
        onClick={prevMonth}
        aria-label={t("prev")}
      >
        <ChevronLeft className="size-5" />
      </Button>
      <p
        className="min-w-0 flex-1 truncate rounded-full bg-muted/70 px-3 py-1.5 text-center text-sm font-semibold tabular-nums ring-1 ring-border/50 sm:text-sm"
        title={short}
      >
        {short}
      </p>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11 shrink-0 touch-manipulation sm:size-9"
        onClick={nextMonth}
        aria-label={t("next")}
      >
        <ChevronRight className="size-5" />
      </Button>
    </div>
  );
}
