"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, CalendarClock, ChevronLeft, CircleDollarSign, Clock, PackageCheck } from "lucide-react";
import { jsonFetch } from "@/lib/fetcher";
import { formatDateLong, formatMoney } from "@/lib/format";
import type { ProjectAttentionItem } from "@/lib/services/project-attention-service";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { projectTypeLabel } from "@/components/forms/project-type-field";
import { PROJECT_TYPES, type ProjectType } from "@/lib/project-type";
import { FilterNativeSelect } from "@/components/ui/filter-native-select";

const kindIcon = {
  payment_overdue: AlertTriangle,
  payment_due_soon: CalendarClock,
  installment_due_soon: Clock,
  stale_quote: Clock,
  delivered_unpaid: PackageCheck,
  pending_balance: CircleDollarSign,
} as const;

type Props = {
  /** On projects list: open detail modal. Omit on collections page. */
  onOpenJob?: (jobId: string) => void;
  /** preview = compact banner; full = link only row */
  variant?: "preview" | "link";
};

export function ProjectCollectionsBanner({ onOpenJob, variant = "preview" }: Props) {
  const t = useTranslations("projects");

  const { data: countData } = useQuery({
    queryKey: ["project-attention", "collections-count"],
    queryFn: () =>
      jsonFetch<{ data: ProjectAttentionItem[] }>(
        "/api/project-jobs/attention?scope=collections"
      ),
    staleTime: 60_000,
  });

  const { data: previewData, isLoading } = useQuery({
    queryKey: ["project-attention", "preview"],
    queryFn: () =>
      jsonFetch<{ data: ProjectAttentionItem[] }>(
        "/api/project-jobs/attention?scope=preview"
      ),
    staleTime: 60_000,
    enabled: variant === "preview",
  });

  const total = countData?.data?.length ?? 0;
  const preview = previewData?.data ?? [];

  if (isLoading && variant === "preview") {
    return <div className="h-12 animate-pulse rounded-xl bg-muted/20" />;
  }
  if (total === 0) return null;

  if (variant === "link") {
    return (
      <Link
        href="/projects/collections"
        className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.04] px-3 py-2.5 text-sm transition hover:bg-amber-500/[0.07]"
      >
        <span className="font-medium text-amber-900 dark:text-amber-200">
          {t("collectionsBannerTitle", { count: total })}
        </span>
        <ChevronLeft className="size-4 shrink-0 rtl:rotate-180" />
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.04] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
          {t("collectionsBannerTitle", { count: total })}
        </p>
        {preview.length > 0 && (
          <ul className="mt-1.5 flex gap-1.5 overflow-x-auto pb-0.5">
            {preview.map((item) => {
              const Icon = kindIcon[item.kind];
              return (
                <li key={`${item.kind}-${item.jobId}-${item.date ?? ""}`}>
                  <button
                    type="button"
                    onClick={() => onOpenJob?.(item.jobId)}
                    className="flex max-w-[14rem] items-center gap-1.5 rounded-lg border border-border/50 bg-card px-2 py-1 text-start text-[11px] shadow-sm transition hover:border-primary/40"
                  >
                    <Icon className="size-3 shrink-0 text-amber-600" />
                    <span className="truncate font-medium">{item.jobName}</span>
                    {item.amount != null && (
                      <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                        {formatMoney(item.amount)}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <Link
        href="/projects/collections"
        className={cn(
          "inline-flex shrink-0 items-center gap-1 rounded-lg border border-amber-600/30 bg-card px-2.5 py-1.5 text-xs font-medium text-amber-900 shadow-sm transition hover:bg-amber-500/10 dark:text-amber-200"
        )}
      >
        {t("collectionsViewAll")}
        <ChevronLeft className="size-3.5 rtl:rotate-180" />
      </Link>
    </div>
  );
}

export function ProjectCollectionsList() {
  const t = useTranslations("projects");
  const locale = useLocale();
  const [typeFilter, setTypeFilter] = useState<ProjectType | "all">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["project-attention", "collections"],
    queryFn: () =>
      jsonFetch<{ data: ProjectAttentionItem[] }>(
        "/api/project-jobs/attention?scope=collections"
      ),
  });

  const items = useMemo(() => data?.data ?? [], [data?.data]);
  const filtered = useMemo(() => {
    if (typeFilter === "all") return items;
    return items.filter((item) => {
      const type = (item.projectType ?? "normal") as ProjectType;
      return type === typeFilter;
    });
  }, [items, typeFilter]);

  const typeOptions = useMemo(
    () => [
      { value: "all", label: t("filterTypeAll") },
      ...PROJECT_TYPES.map((type) => ({
        value: type,
        label: t(`type.${type}`),
      })),
    ],
    [t]
  );

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-xl bg-muted/20" />;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 py-16 text-center text-sm text-muted-foreground">
        {t("collectionsEmpty")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border/60 bg-card p-3">
        <FilterNativeSelect
          id="collections-filter-type"
          label={t("filterType")}
          value={typeFilter}
          options={typeOptions}
          onChange={(v) => setTypeFilter(v as ProjectType | "all")}
          active={typeFilter !== "all"}
          className="w-full min-w-[10rem] sm:max-w-[14rem]"
        />
        <p className="pb-2 text-xs text-muted-foreground">
          {t("collectionsFilterResult", {
            shown: filtered.length,
            total: items.length,
          })}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 py-12 text-center text-sm text-muted-foreground">
          {t("collectionsFilterEmpty")}
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((item) => {
            const Icon = kindIcon[item.kind];
            return (
              <li key={`${item.kind}-${item.jobId}-${item.date ?? ""}`}>
                <Link
                  href={`/projects/${item.jobId}`}
                  className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-3 shadow-sm transition hover:border-primary/35 hover:shadow-md"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                      {t(`attention_${item.kind}`)}
                    </p>
                    <p className="mt-0.5 truncate font-medium">{item.jobName}</p>
                    {item.clientName ? (
                      <p className="truncate text-xs text-muted-foreground">{item.clientName}</p>
                    ) : null}
                    {item.projectType ? (
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {projectTypeLabel(
                          (item.projectType as ProjectType) ?? "normal",
                          t
                        )}
                      </p>
                    ) : null}
                    <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
                      {item.amount != null ? formatMoney(item.amount) : ""}
                      {item.date
                        ? ` · ${formatDateLong(new Date(item.date), locale)}`
                        : ""}
                    </p>
                  </div>
                  <ChevronLeft className="size-4 shrink-0 self-center text-muted-foreground rtl:rotate-180" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
