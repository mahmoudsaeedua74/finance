"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Layers } from "lucide-react";
import { jsonFetch } from "@/lib/fetcher";
import { formatMoney } from "@/lib/format";
import type { NormalProjectsSummary } from "@/lib/services/freelance-project-service";

type Props = {
  onOpenJob?: (jobId: string) => void;
};

export function ProjectNormalBanner({ onOpenJob }: Props) {
  const t = useTranslations("projects");

  const { data, isLoading } = useQuery({
    queryKey: ["normal-projects-summary"],
    queryFn: () => jsonFetch<{ data: NormalProjectsSummary }>("/api/project-jobs/normal-summary"),
    staleTime: 120_000,
  });

  const summary = data?.data;

  if (isLoading) {
    return <div className="h-12 animate-pulse rounded-xl bg-muted/20" />;
  }
  if (!summary || summary.uncollectedCount === 0) return null;

  return (
    <div className="space-y-2 rounded-xl border border-sky-500/25 bg-sky-500/[0.04] px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-700 dark:text-sky-400">
          <Layers className="size-4" aria-hidden />
        </span>
        <p className="min-w-0 text-xs font-semibold text-sky-900 dark:text-sky-200 sm:text-sm">
          {t("normalBannerUncollected", {
            count: summary.uncollectedCount,
            amount: formatMoney(summary.pendingAmount),
          })}
        </p>
      </div>

      {summary.preview.length > 0 ? (
        <ul className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5 [scrollbar-width:thin]">
          {summary.preview.map((item) => (
            <li key={item.id} className="shrink-0">
              <button
                type="button"
                onClick={() => onOpenJob?.(item.id)}
                className="max-w-[12rem] truncate rounded-lg border border-border/50 bg-card px-2.5 py-1.5 text-start text-[11px] font-medium shadow-sm transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                title={item.name}
              >
                {item.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
