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
}: {
  payouts: Payout[];
  costs: Cost[];
}) {
  const t = useTranslations("projects");
  const locale = useLocale();
  const today = new Date();
  const [mode, setMode] = useState<"month" | "range">("month");
  const [monthValue, setMonthValue] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`
  );
  const [from, setFrom] = useState(toLocalYmd(startOfMonth(today)));
  const [to, setTo] = useState(defaultFormDateYmd());

  const bounds = useMemo(() => {
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

  const collected = payouts.filter((p) => p.isCollected && inRange(p.collectedAt || p.date, bounds.start, bounds.end));
  const spent = costs.filter((c) => inRange(c.date, bounds.start, bounds.end));

  const months = useMemo(() => {
    const map = new Map<string, { income: number; spent: number }>();
    for (const p of collected) {
      const key = monthKey(p.collectedAt || p.date);
      const row = map.get(key) ?? { income: 0, spent: 0 };
      row.income += p.amount;
      map.set(key, row);
    }
    for (const c of spent) {
      const key = monthKey(c.date);
      const row = map.get(key) ?? { income: 0, spent: 0 };
      row.spent += c.amount;
      map.set(key, row);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [collected, spent]);

  const incomeTotal = collected.reduce((s, p) => s + p.amount, 0);
  const spentTotal = spent.reduce((s, c) => s + c.amount, 0);

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

      {mode === "month" ? (
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
      ) : (
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

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-border/60 p-2">
          <p className="text-[11px] text-muted-foreground">{t("projectReportCollected")}</p>
          <p className="font-mono text-base font-semibold tabular-nums">{formatMoney(incomeTotal)}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t("projectReportCash")} {formatMoney(sumMethod(collected, "cash"))}
            {" · "}
            {t("projectReportCard")} {formatMoney(sumMethod(collected, "card"))}
          </p>
        </div>
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

      {months.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-start text-xs text-muted-foreground">
                <th className="py-1 pe-3 font-medium">{t("projectReportByMonth")}</th>
                <th className="py-1 pe-3 text-end font-medium">{t("projectReportCollected")}</th>
                <th className="py-1 text-end font-medium">{t("projectReportSpent")}</th>
              </tr>
            </thead>
            <tbody>
              {months.map(([key, row]) => {
                const [y, m] = key.split("-").map(Number);
                const label = new Intl.DateTimeFormat(locale, {
                  month: "long",
                  year: "numeric",
                }).format(new Date(y, (m || 1) - 1, 1));
                return (
                  <tr key={key} className="border-t border-border/50">
                    <td className="py-1.5 pe-3">{label}</td>
                    <td className="py-1.5 pe-3 text-end font-mono tabular-nums">{formatMoney(row.income)}</td>
                    <td className="py-1.5 text-end font-mono tabular-nums">{formatMoney(row.spent)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {collected.length === 0 && spent.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("projectReportEmpty")}</p>
      ) : (
        <ul className="space-y-1">
          {collected.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate text-muted-foreground">
                {formatDateLong(new Date(p.collectedAt || p.date), locale)}
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
