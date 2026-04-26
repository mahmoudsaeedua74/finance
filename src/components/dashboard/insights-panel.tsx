"use client";

import { useTranslations } from "next-intl";
import { memo } from "react";
import { AlertTriangle, Lightbulb, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { labelExpenseCategory } from "@/lib/expense-categories";
import type { MonthlyReportDto } from "@/types/report";

function InsightsPanelInner({ report }: { report: MonthlyReportDto | undefined }) {
  const t = useTranslations("insight");
  const tCat = useTranslations("expense.categories");
  if (!report) return null;
  const { insights } = report;
  return (
    <Card className="overflow-hidden border-dashed border-primary/20 bg-gradient-to-br from-primary/[0.03] via-card to-muted/10 ring-1 ring-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          <span className="inline-flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </span>
            {t("title")}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm leading-relaxed">
        {insights.overspent && (
          <div className="flex gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.08] p-3.5 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-50">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center self-start rounded-lg bg-amber-500/20">
              <AlertTriangle className="size-4 text-amber-800 dark:text-amber-200" />
            </div>
            <p>{t("over")}</p>
          </div>
        )}
        {!insights.overspent && (
          <div className="flex gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.08] p-3.5 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-50">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center self-start rounded-lg bg-emerald-500/20">
              <Lightbulb className="size-4 text-emerald-800 dark:text-emerald-200" />
            </div>
            <p>{t("ok")}</p>
          </div>
        )}
        {insights.biggestExpenseCategory && (
          <p className="rounded-lg bg-muted/40 px-3 py-2 text-[0.9rem]">
            <span className="text-muted-foreground">{t("largest")} </span>
            <span className="font-semibold text-foreground">
              {labelExpenseCategory(insights.biggestExpenseCategory.name, tCat)}
            </span>{" "}
            {t("largestAt", {
              amount: formatMoney(insights.biggestExpenseCategory.amount),
            })}
          </p>
        )}
        <p className="text-[0.9rem]">
          <span className="text-muted-foreground">{t("moneyLeft")} </span>
          <span
            className={
              insights.moneyLeft >= 0
                ? "text-lg font-semibold text-emerald-600 dark:text-emerald-400"
                : "text-lg font-semibold text-rose-600 dark:text-rose-400"
            }
          >
            {formatMoney(insights.moneyLeft)}
          </span>
        </p>
      </CardContent>
    </Card>
  );
}

export const InsightsPanel = memo(InsightsPanelInner);
