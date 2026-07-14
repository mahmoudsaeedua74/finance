"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { CheckCircle2, ChevronLeft, CircleDollarSign, Layers } from "lucide-react";
import { jsonFetch } from "@/lib/fetcher";
import { formatMoney } from "@/lib/format";
import type { NormalProjectsSummary } from "@/lib/services/freelance-project-service";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Props = {
  onOpenJob?: (jobId: string) => void;
};

export function ProjectNormalBanner({ onOpenJob }: Props) {
  const t = useTranslations("projects");

  const { data, isLoading } = useQuery({
    queryKey: ["normal-projects-summary"],
    queryFn: () => jsonFetch<{ data: NormalProjectsSummary }>("/api/project-jobs/normal-summary"),
    staleTime: 60_000,
  });

  const summary = data?.data;

  if (isLoading) {
    return <div className="h-14 animate-pulse rounded-xl bg-muted/20" />;
  }
  if (!summary || summary.total === 0) return null;

  const allCollected = summary.uncollectedCount === 0;
  const pendingHref = "/projects?type=normal&collected=pending";
  const allNormalHref = "/projects?type=normal";

  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 rounded-xl border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between",
        allCollected
          ? "border-emerald-500/25 bg-emerald-500/[0.04]"
          : "border-sky-500/25 bg-sky-500/[0.04]"
      )}
    >
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg",
              allCollected ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-sky-500/15 text-sky-700 dark:text-sky-400"
            )}
          >
            {allCollected ? <CheckCircle2 className="size-4" /> : <Layers className="size-4" />}
          </div>
          <div className="min-w-0">
            <p
              className={cn(
                "text-xs font-semibold sm:text-sm",
                allCollected ? "text-emerald-900 dark:text-emerald-200" : "text-sky-900 dark:text-sky-200"
              )}
            >
              {allCollected
                ? t("normalBannerAllCollected", { total: summary.total })
                : t("normalBannerUncollected", { count: summary.uncollectedCount })}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              {summary.collectedCount > 0 ? (
                <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-1.5 py-0.5 font-medium text-emerald-800 dark:text-emerald-300">
                  {t("normalBannerCollectedChip", { count: summary.collectedCount })}
                </span>
              ) : null}
              {!allCollected ? (
                <span className="inline-flex items-center gap-1 font-mono tabular-nums text-amber-700 dark:text-amber-300">
                  <CircleDollarSign className="size-3" />
                  {t("normalBannerPendingAmount", { amount: formatMoney(summary.pendingAmount) })}
                </span>
              ) : null}
              {summary.total > 0 ? (
                <span>{t("normalBannerTotal", { total: summary.total })}</span>
              ) : null}
            </div>
          </div>
        </div>

        {!allCollected && summary.preview.length > 0 ? (
          <ul className="flex gap-1.5 overflow-x-auto pb-0.5">
            {summary.preview.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onOpenJob?.(item.id)}
                  className="flex max-w-[15rem] items-center gap-1.5 rounded-lg border border-border/50 bg-card px-2 py-1 text-start text-[11px] shadow-sm transition hover:border-primary/40"
                >
                  <span className="truncate font-medium">{item.name}</span>
                  <span className="shrink-0 font-mono tabular-nums text-amber-700 dark:text-amber-300">
                    {formatMoney(item.pendingAmount)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap gap-1.5">
        {!allCollected ? (
          <Link
            href={pendingHref}
            className="inline-flex items-center gap-1 rounded-lg border border-sky-600/30 bg-card px-2.5 py-1.5 text-xs font-medium text-sky-900 shadow-sm transition hover:bg-sky-500/10 dark:text-sky-200"
          >
            {t("normalBannerViewPending")}
            <ChevronLeft className="size-3.5 rtl:rotate-180" />
          </Link>
        ) : null}
        <Link
          href={allNormalHref}
          className={cn(
            "inline-flex items-center gap-1 rounded-lg border bg-card px-2.5 py-1.5 text-xs font-medium shadow-sm transition",
            allCollected
              ? "border-emerald-600/30 text-emerald-900 hover:bg-emerald-500/10 dark:text-emerald-200"
              : "border-border/60 text-muted-foreground hover:bg-muted/30 hover:text-foreground"
          )}
        >
          {t("normalBannerViewAll")}
          <ChevronLeft className="size-3.5 rtl:rotate-180" />
        </Link>
      </div>
    </div>
  );
}
