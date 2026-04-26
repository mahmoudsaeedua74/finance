"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useMonth } from "@/context/month-context";
import { monthLabel } from "@/lib/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const years = (() => {
  const y = new Date().getFullYear();
  return Array.from({ length: 7 }, (_, i) => y - 3 + i);
})();

function monthLocaleOptions(locale: string) {
  const loc = locale === "ar" ? ar : enUS;
  return Array.from({ length: 12 }, (_, i) => ({
    v: i + 1,
    label: format(new Date(2000, i, 1), "LLLL", { locale: loc }),
  }));
}

export function MonthSwitcher({ className }: { className?: string }) {
  const t = useTranslations("month");
  const locale = useLocale();
  const { year, month, setYearMonth, nextMonth, prevMonth } = useMonth();
  const months = monthLocaleOptions(locale);
  return (
    <div
      className={cn("flex flex-col gap-2", className)}
      dir="ltr"
    >
      <div className="flex items-center justify-between gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-10 shrink-0 touch-manipulation"
          onClick={prevMonth}
          aria-label={t("prev")}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <p className="min-w-0 flex-1 truncate text-center text-sm font-medium sm:text-sm">
          {monthLabel(year, month, locale)}
        </p>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-10 shrink-0 touch-manipulation"
          onClick={nextMonth}
          aria-label={t("next")}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Select
          value={String(month)}
          onValueChange={(v) => v && setYearMonth(year, Number(v))}
        >
          <SelectTrigger className="h-11 min-h-11 w-full text-sm data-[size=default]:h-11 md:h-8 md:min-h-8 md:data-[size=default]:h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m.v} value={String(m.v)}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={String(year)}
          onValueChange={(v) => v && setYearMonth(Number(v), month)}
        >
          <SelectTrigger className="h-11 min-h-11 w-full text-sm data-[size=default]:h-11 md:h-8 md:min-h-8 md:data-[size=default]:h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
