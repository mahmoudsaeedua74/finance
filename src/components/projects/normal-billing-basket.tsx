"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ArrowLeftRight, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { jsonFetch } from "@/lib/fetcher";
import type { ProjectJobDto } from "@/types/project-job";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Group = {
  clientName: string;
  hasClient: boolean;
  count: number;
  totalEgp: number;
  jobIds: string[];
  suggestCount?: number;
  suggestTotalEgp?: number;
  samePrice?: boolean;
  unitAmount?: number | null;
};

type InvoiceDto = {
  id: string;
  clientName: string;
  jobIds: string[];
  status: string;
  totalEgp: number;
};

const SUGGEST_N = 10;

type Props = {
  onChanged?: () => void;
};

export function NormalBillingBasketPanel({ onChanged }: Props) {
  const t = useTranslations("projects");
  const qc = useQueryClient();
  const [active, setActive] = useState<Group | null>(null);
  const [inBasket, setInBasket] = useState<Set<string>>(new Set());

  const groupsQ = useQuery({
    queryKey: ["invoice-groups"],
    queryFn: () => jsonFetch<{ data: Group[] }>("/api/invoices?mode=groups"),
    staleTime: 30_000,
  });

  const idsKey = active?.jobIds?.join(",") ?? "";
  const poolQ = useQuery({
    queryKey: ["invoice-jobs", idsKey],
    queryFn: () =>
      jsonFetch<{ data: ProjectJobDto[] }>(
        `/api/invoices?mode=jobs&ids=${encodeURIComponent(idsKey)}`
      ),
    enabled: !!active && active.jobIds.length > 0,
  });

  const jobs = useMemo(() => poolQ.data?.data ?? [], [poolQ.data?.data]);
  const inJobs = useMemo(() => jobs.filter((j) => inBasket.has(j.id)), [jobs, inBasket]);
  const outJobs = useMemo(() => jobs.filter((j) => !inBasket.has(j.id)), [jobs, inBasket]);
  const basketTotal = useMemo(
    () => inJobs.reduce((s, j) => s + j.agreedAmount, 0),
    [inJobs]
  );

  const openGroup = (g: Group) => {
    setActive(g);
    setInBasket(new Set(g.jobIds.slice(0, Math.min(SUGGEST_N, g.jobIds.length))));
  };

  const moveIn = (id: string) => setInBasket((prev) => new Set(prev).add(id));
  const moveOut = (id: string) =>
    setInBasket((prev) => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });

  const suggestTen = () => {
    const ids = (jobs.length ? jobs.map((j) => j.id) : active?.jobIds ?? []).slice(
      0,
      SUGGEST_N
    );
    setInBasket(new Set(ids));
  };

  const saveMut = useMutation({
    mutationFn: () => {
      if (!active?.hasClient || !active.clientName.trim()) {
        throw new Error(t("invoiceNeedClient"));
      }
      return jsonFetch<{ data: InvoiceDto }>("/api/invoices", {
        method: "POST",
        body: JSON.stringify({
          clientName: active.clientName.trim(),
          jobIds: Array.from(inBasket),
          status: "issued",
        }),
      });
    },
    onSuccess: () => {
      toast.success(t("invoiceCreated"));
      setActive(null);
      setInBasket(new Set());
      void qc.invalidateQueries({ queryKey: ["invoice-groups"] });
      void qc.invalidateQueries({ queryKey: ["project-jobs"] });
      onChanged?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const groups = groupsQ.data?.data ?? [];
  if (!groups.length && !groupsQ.isLoading) return null;

  const clientLabel = (g: Group) =>
    g.hasClient && g.clientName.trim() ? g.clientName : t("noClientName");

  return (
    <Card className="border-amber-500/25 bg-amber-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ArrowLeftRight className="size-4 text-amber-700 dark:text-amber-400" />
          {t("normalBillingTitle")}
        </CardTitle>
        <p className="text-xs leading-relaxed text-muted-foreground">{t("normalBillingDesc")}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {groupsQ.isLoading && (
          <p className="text-sm text-muted-foreground">{t("billingLoading")}</p>
        )}

        {!active && !groupsQ.isLoading && (
          <div className="grid gap-2 sm:grid-cols-2">
            {groups.map((g) => (
              <button
                key={`${g.hasClient ? g.clientName : "no-client"}-${g.jobIds[0] ?? g.count}`}
                type="button"
                className={cn(
                  "rounded-xl border border-border/60 bg-background/80 p-3 text-start transition hover:border-amber-500/40",
                  !g.hasClient && "opacity-90"
                )}
                onClick={() => openGroup(g)}
              >
                <p className="font-medium">{clientLabel(g)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("normalBillingGroupMeta", {
                    count: g.count,
                    total: formatMoney(g.totalEgp),
                  })}
                  {g.count >= SUGGEST_N && g.suggestTotalEgp != null
                    ? ` · ${t("normalBillingSuggestMeta", {
                        n: g.suggestCount ?? SUGGEST_N,
                        total: formatMoney(g.suggestTotalEgp),
                      })}`
                    : ""}
                </p>
                {!g.hasClient && (
                  <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">
                    {t("noClientHint")}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}

        {active && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">{clientLabel(active)}</p>
                <p className="text-xs text-muted-foreground">
                  {t("normalBillingBasketMeta", {
                    in: inBasket.size,
                    out: Math.max(0, (active.jobIds.length || jobs.length) - inBasket.size),
                    total: formatMoney(basketTotal),
                  })}
                </p>
                {!active.hasClient && (
                  <p className="mt-1 text-xs text-destructive">{t("invoiceNeedClient")}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={suggestTen}>
                  {t("suggestTen")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setActive(null);
                    setInBasket(new Set());
                  }}
                >
                  {t("backToGroups")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={
                    inBasket.size === 0 || saveMut.isPending || !active.hasClient
                  }
                  onClick={() => saveMut.mutate()}
                >
                  {saveMut.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    t("createInvoiceFromBasket")
                  )}
                </Button>
              </div>
            </div>

            {poolQ.isLoading ? (
              <p className="text-sm text-muted-foreground">{t("billingLoading")}</p>
            ) : poolQ.isError ? (
              <p className="text-sm text-destructive">{t("billingLoadError")}</p>
            ) : !jobs.length ? (
              <p className="text-sm text-muted-foreground">{t("billingNoJobs")}</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                  <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    {t("basketIn")} · {inJobs.length}
                  </p>
                  {inJobs.map((j) => (
                    <div
                      key={j.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-background/70 px-2 py-1.5 text-sm"
                    >
                      <span className="min-w-0 truncate">{j.name}</span>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="font-mono text-xs tabular-nums">
                          {j.currency === "SAR"
                            ? formatMoney(j.originalAmount, "SAR")
                            : formatMoney(j.agreedAmount)}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 gap-1 px-2"
                          onClick={() => moveOut(j.id)}
                        >
                          <X className="size-3.5" />
                          {t("basketRemove")}
                        </Button>
                      </div>
                    </div>
                  ))}
                  {!inJobs.length && (
                    <p className="text-xs text-muted-foreground">{t("basketEmptyIn")}</p>
                  )}
                </div>
                <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {t("basketOut")} · {outJobs.length}
                  </p>
                  {outJobs.map((j) => (
                    <div
                      key={j.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-background/70 px-2 py-1.5 text-sm"
                    >
                      <span className="min-w-0 truncate">{j.name}</span>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="font-mono text-xs tabular-nums">
                          {j.currency === "SAR"
                            ? formatMoney(j.originalAmount, "SAR")
                            : formatMoney(j.agreedAmount)}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-7 gap-1 px-2"
                          onClick={() => moveIn(j.id)}
                        >
                          <Plus className="size-3.5" />
                          {t("basketAdd")}
                        </Button>
                      </div>
                    </div>
                  ))}
                  {!outJobs.length && (
                    <p className="text-xs text-muted-foreground">{t("basketEmptyOut")}</p>
                  )}
                </div>
              </div>
            )}
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {t("basketFlexibleHint")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
