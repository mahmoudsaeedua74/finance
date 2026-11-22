"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { endOfMonth, startOfMonth } from "date-fns";
import { PaymentMethodLabel } from "@/components/forms/payment-method-label";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateLong, formatMoney } from "@/lib/format";
import { defaultFormDateYmd, toLocalYmd } from "@/lib/ymd";
import type { ProjectJobDto } from "@/types/project-job";
import type { FeatureDto } from "@/types/feature";
import { summarizeProjectOutstanding, type ProjectBillingLine } from "@/lib/project-billing";
import { roundMoney } from "@/lib/currency";
import { cn } from "@/lib/utils";

type Payout = ProjectJobDto["payouts"][number];
type Cost = ProjectJobDto["costs"][number];

function ymdStart(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
}

function ymdEnd(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 23, 59, 59, 999);
}

function inRange(iso: string, start: Date, end: Date) {
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function sumMethod(rows: { amount: number; paymentMethod?: string }[], method: "cash" | "card") {
  return rows.reduce((s, r) => (r.paymentMethod === method ? s + r.amount : s), 0);
}

export function ProjectPeriodReport({
  payouts,
  costs,
  outstandingLines,
  outstandingStatus,
  features,
}: {
  payouts: Payout[];
  costs: Cost[];
  outstandingLines: ProjectBillingLine[];
  outstandingStatus: "loading" | "error" | null;
  features?: Pick<FeatureDto, "id" | "title">[];
}) {
  const t = useTranslations("projects");
  const locale = useLocale();
  const today = new Date();
  const [mode, setMode] = useState<"all" | "month" | "range">("all");
  const [monthValue, setMonthValue] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`
  );
  const [from, setFrom] = useState(toLocalYmd(startOfMonth(today)));
  const [to, setTo] = useState(defaultFormDateYmd());

  const bounds = useMemo(() => {
    if (mode === "all") return null;
    if (mode === "month") {
      const [y, m] = monthValue.split("-").map(Number);
      const start = startOfMonth(new Date(y || new Date().getFullYear(), (m || 1) - 1, 1));
      return { start, end: endOfMonth(start) };
    }
    const start = ymdStart(from);
    const end = ymdEnd(to);
    if (start.getTime() <= end.getTime()) return { start, end };
    return { start: end, end: start };
  }, [mode, monthValue, from, to]);

  const collectedAll = payouts.filter((p) => p.isCollected);
  const collected = bounds
    ? collectedAll.filter((p) => inRange(p.collectedAt || p.date, bounds.start, bounds.end))
    : collectedAll;
  const spent = bounds ? costs.filter((c) => inRange(c.date, bounds.start, bounds.end)) : costs;
  const installments = collected.filter((p) => p.lineKind === "installment");
  const support = collected.filter((p) => p.lineKind === "support");
  const featureReceipts = collected.filter((p) => p.lineKind === "feature");
  const featureTitles = new Map(features?.map((feature) => [feature.id, feature.title]));
  const outstanding = summarizeProjectOutstanding(
    outstandingLines,
    bounds ? { from: toLocalYmd(bounds.start), to: toLocalYmd(bounds.end) } : undefined,
  );

  const months = useMemo(() => {
    const map = new Map<string, { installments: number; support: number; features: number; spent: number; outstanding: number }>();
    function getMonth(key: string) {
      const existing = map.get(key);
      if (existing) return existing;
      const row = { installments: 0, support: 0, features: 0, spent: 0, outstanding: 0 };
      map.set(key, row);
      return row;
    }
    for (const p of collected) {
      const row = getMonth(monthKey(p.collectedAt || p.date));
      if (p.lineKind === "support") row.support += p.amount;
      else if (p.lineKind === "feature") row.features += p.amount;
      else row.installments += p.amount;
    }
    for (const c of spent) {
      getMonth(monthKey(c.date)).spent += c.amount;
    }
    for (const line of outstanding.lines) {
      getMonth(line.dueDate?.slice(0, 7) ?? "undated").outstanding += line.amount;
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [collected, spent, outstanding.lines]);

  const incomeTotal = collected.reduce((s, p) => s + p.amount, 0);
  const installmentTotal = installments.reduce((s, p) => s + p.amount, 0);
  const supportTotal = support.reduce((s, p) => s + p.amount, 0);
  const featureTotal = featureReceipts.reduce((s, p) => s + p.amount, 0);
  const spentTotal = spent.reduce((s, c) => s + c.amount, 0);
  const receiptsByKind = [
    { key: "installments", title: t("projectReportInstallments"), total: installmentTotal, rows: installments },
    { key: "support", title: t("supportSection"), total: supportTotal, rows: support },
    { key: "features", title: t("featuresTitle"), total: featureTotal, rows: featureReceipts },
  ] as const;
  const elsewhere = collectedAll
    .filter((p) => !collected.some((row) => row.id === p.id))
    .map((p) => monthKey(p.collectedAt || p.date));
  const elsewhereLabel = Array.from(new Set(elsewhere))
    .sort()
    .map((key) => {
      const [y, m] = key.split("-").map(Number);
      return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
        new Date(y, (m || 1) - 1, 1)
      );
    })
    .join("، ");

  return (
    <section className="space-y-3 rounded-xl border border-border/60 bg-card p-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{t("projectReportTitle")}</h2>
          <p className="text-xs text-muted-foreground">{t("projectReportHint")}</p>
        </div>
        <div className="flex rounded-lg border border-border/70 p-0.5 text-xs">
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5",
              mode === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
            onClick={() => setMode("all")}
          >
            {t("projectReportAll")}
          </button>
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5",
              mode === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
            onClick={() => setMode("month")}
          >
            {t("projectReportMonth")}
          </button>
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5",
              mode === "range" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
            onClick={() => setMode("range")}
          >
            {t("projectReportRange")}
          </button>
        </div>
      </div>

      {mode === "month" && (
        <div className="max-w-xs space-y-1">
          <Label htmlFor="project-report-month">{t("projectReportMonth")}</Label>
          <Input
            id="project-report-month"
            type="month"
            className="h-11"
            value={monthValue}
            onChange={(e) => setMonthValue(e.target.value)}
          />
        </div>
      )}
      {mode === "range" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="project-report-from">{t("projectReportFrom")}</Label>
            <Input
              id="project-report-from"
              type="date"
              className="h-11"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="project-report-to">{t("projectReportTo")}</Label>
            <Input
              id="project-report-to"
              type="date"
              className="h-11"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {receiptsByKind.map(({ key, title, total, rows }) => (
          <div key={key} className="rounded-lg border border-border/60 p-2">
            <p className="text-[11px] text-muted-foreground">{title}</p>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">{t("projectReportCollected")}</span>
              <bdi className="font-mono text-base font-semibold tabular-nums">{formatMoney(total)}</bdi>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t("projectReportCash")} {formatMoney(sumMethod(rows, "cash"))}
              {" · "}{t("projectReportCard")} {formatMoney(sumMethod(rows, "card"))}
            </p>
            <div className={cn("mt-2 flex items-baseline justify-between gap-2 border-t border-border/50 pt-1.5 text-xs",
              outstanding[key] > 0 && "text-amber-700 dark:text-amber-400",
            )}>
              <span>{t("supportDue")}</span>
              <bdi className="font-mono font-semibold tabular-nums">{formatMoney(outstanding[key])}</bdi>
            </div>
          </div>
        ))}
        <div className="rounded-lg border border-border/60 p-2">
          <p className="text-[11px] text-muted-foreground">{t("projectReportSpent")}</p>
          <p className="font-mono text-base font-semibold tabular-nums">{formatMoney(spentTotal)}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t("projectReportCash")} {formatMoney(sumMethod(spent, "cash"))}
            {" · "}
            {t("projectReportCard")} {formatMoney(sumMethod(spent, "card"))}
          </p>
        </div>
        <div className="rounded-lg border border-border/60 p-2">
          <p className="text-[11px] text-muted-foreground">{t("netProfit")}</p>
          <p className="font-mono text-base font-semibold tabular-nums">
            {formatMoney(incomeTotal - spentTotal)}
          </p>
        </div>
      </div>

      {outstanding.lines.length > 0 && (
        <div className="flex justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
          <span>{t("projectOutstandingTotal")}</span>
          <bdi className="font-mono font-semibold tabular-nums text-amber-700 dark:text-amber-400">{formatMoney(outstanding.total)}</bdi>
        </div>
      )}
      {outstandingStatus && (
        <p className="text-xs text-muted-foreground">
          {t(outstandingStatus === "loading" ? "loadingFeatures" : "projectOutstandingFeaturesError")}
        </p>
      )}

      {incomeTotal === 0 && elsewhereLabel && (
        <p className="text-sm text-muted-foreground">
          {t("projectReportElsewhere", { months: elsewhereLabel })}
        </p>
      )}

      {months.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-start text-xs text-muted-foreground">
                <th className="py-1 pe-3 font-medium">{t("projectReportByMonth")}</th>
                <th className="py-1 pe-3 text-end font-medium">{t("projectReportInstallments")}</th>
                <th className="py-1 pe-3 text-end font-medium">{t("supportSection")}</th>
                <th className="py-1 pe-3 text-end font-medium">{t("featuresTitle")}</th>
                <th className="py-1 pe-3 text-end font-medium">{t("supportDue")}</th>
                <th className="py-1 text-end font-medium">{t("projectReportSpent")}</th>
              </tr>
            </thead>
            <tbody>
              {months.map(([key, row]) => {
                const [y, m] = key.split("-").map(Number);
                const label = key === "undated" ? t("projectOutstandingUndated") : new Intl.DateTimeFormat(locale, {
                  month: "long",
                  year: "numeric",
                }).format(new Date(y, (m || 1) - 1, 1));
                return (
                  <tr key={key} className="border-t border-border/50">
                    <td className="py-1.5 pe-3">{label}</td>
                    <td className="py-1.5 pe-3 text-end font-mono tabular-nums">{formatMoney(row.installments)}</td>
                    <td className="py-1.5 pe-3 text-end font-mono tabular-nums">{formatMoney(row.support)}</td>
                    <td className="py-1.5 pe-3 text-end font-mono tabular-nums">{formatMoney(row.features)}</td>
                    <td className={cn("py-1.5 pe-3 text-end font-mono tabular-nums", row.outstanding > 0 && "text-amber-700 dark:text-amber-400")}>
                      {formatMoney(roundMoney(row.outstanding))}
                    </td>
                    <td className="py-1.5 text-end font-mono tabular-nums">{formatMoney(row.spent)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {collected.length === 0 && spent.length === 0 && outstanding.lines.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("projectReportEmpty")}</p>
      ) : (
        <ul className="space-y-1">
          {outstanding.lines.map((line, index) => {
            const isFeature = Boolean(line.featureId) || line.source === "feature";
            const title = (line.featureId && featureTitles.get(line.featureId)) || line.title;
            return (
              <li key={`outstanding-${index}`} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate text-muted-foreground">
                  {t("supportDue")} · {title}
                  {line.dueDate ? ` · ${formatDateLong(new Date(`${line.dueDate}T12:00:00`), locale)}` : ""}
                  {!isFeature && line.detail ? ` · ${line.detail}` : ""}
                </span>
                <bdi className="shrink-0 font-mono tabular-nums text-amber-700 dark:text-amber-400">{formatMoney(line.amount)}</bdi>
              </li>
            );
          })}
          {collected.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate text-muted-foreground">
                {formatDateLong(new Date(p.collectedAt || p.date), locale)}
                {" · "}
                {p.lineKind === "support" ? t("supportSection") : p.lineKind === "feature" ? t("featuresTitle") : t("installmentsList")}
                {p.note ? ` · ${p.note}` : ""}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <PaymentMethodLabel method={p.paymentMethod} />
                <span className="font-mono tabular-nums">{formatMoney(p.amount)}</span>
              </span>
            </li>
          ))}
          {spent.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate text-muted-foreground">
                {formatDateLong(new Date(c.date), locale)} · {c.title}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <PaymentMethodLabel method={c.paymentMethod} />
                <span className="font-mono tabular-nums text-amber-700 dark:text-amber-300">
                  −{formatMoney(c.amount)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
