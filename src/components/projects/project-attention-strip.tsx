"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, Clock, FileQuestion, PackageCheck, CalendarClock } from "lucide-react";
import { jsonFetch } from "@/lib/fetcher";
import { formatDateLong, formatMoney } from "@/lib/format";
import type { ProjectAttentionItem } from "@/lib/services/project-attention-service";
import { cn } from "@/lib/utils";

type Props = {
  onOpenJob?: (jobId: string) => void;
};

const kindIcon = {
  payment_overdue: AlertTriangle,
  payment_due_soon: CalendarClock,
  installment_due_soon: Clock,
  stale_quote: FileQuestion,
  delivered_unpaid: PackageCheck,
} as const;

export function ProjectAttentionStrip({ onOpenJob }: Props) {
  const t = useTranslations("projects");
  const locale = useLocale();

  const { data, isLoading } = useQuery({
    queryKey: ["project-attention"],
    queryFn: () => jsonFetch<{ data: ProjectAttentionItem[] }>("/api/project-jobs/attention"),
    staleTime: 60_000,
  });

  const items = data?.data ?? [];
  if (isLoading) {
    return <div className="h-16 animate-pulse rounded-xl bg-muted/20" />;
  }
  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.04] p-3 shadow-sm">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
        {t("attentionTitle")}
      </p>
      <ul className="flex gap-2 overflow-x-auto pb-1">
        {items.map((item) => {
          const Icon = kindIcon[item.kind];
          return (
            <li key={`${item.kind}-${item.jobId}-${item.date ?? ""}`}>
              <button
                type="button"
                onClick={() => onOpenJob?.(item.jobId)}
                className={cn(
                  "flex min-w-[11rem] max-w-[16rem] flex-col gap-0.5 rounded-xl border border-border/60 bg-card px-3 py-2 text-start text-xs shadow-sm transition hover:border-primary/40 hover:shadow-md"
                )}
              >
                <span className="flex items-center gap-1.5 font-medium leading-snug">
                  <Icon className="size-3.5 shrink-0 text-amber-600" />
                  <span className="truncate">{t(`attention_${item.kind}`)}</span>
                </span>
                <span className="truncate text-muted-foreground">{item.jobName}</span>
                {item.clientName ? (
                  <span className="truncate text-[10px] text-muted-foreground">{item.clientName}</span>
                ) : null}
                <span className="font-mono tabular-nums text-[10px]">
                  {item.amount != null ? formatMoney(item.amount) : ""}
                  {item.date ? ` · ${formatDateLong(new Date(item.date), locale)}` : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
