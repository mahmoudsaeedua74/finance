"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import type { MonthlyReportDto } from "@/types/report";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const cardMotion = { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 } };

function SummaryCardsInner({
  report,
  allTime = false,
}: {
  report: MonthlyReportDto | undefined;
  allTime?: boolean;
}) {
  const t = useTranslations("summary");
  const s = report?.summary;
  const exHint = allTime ? t("expenseHintAllTime") : t("expenseHint");
  const incHint = allTime ? t("incomeHintAllTime") : t("incomeHint");
  if (!s) {
    return (
      <div className="grid min-w-0 max-w-full grid-cols-1 gap-2.5 min-[400px]:gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-28 min-[400px]:h-32 rounded-xl border border-border/50 bg-card/50 animate-pulse"
          />
        ))}
      </div>
    );
  }
  return (
    <div className="grid min-w-0 max-w-full grid-cols-1 gap-2.5 min-[400px]:gap-3 sm:grid-cols-3">
      <motion.div {...cardMotion} transition={{ delay: 0.05 }}>
        <Card className="overflow-hidden border-border/60 bg-gradient-to-br from-card to-emerald-500/[0.04] shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-1">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("income")}
              </CardTitle>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold tabular-nums tracking-tight min-[400px]:text-2xl">
              {formatMoney(s.totalIncome)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{incHint}</p>
          </CardContent>
        </Card>
      </motion.div>
      <motion.div {...cardMotion} transition={{ delay: 0.1 }}>
        <Card className="overflow-hidden border-border/60 bg-gradient-to-br from-card to-rose-500/[0.04] shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-1">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("expense")}
              </CardTitle>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <TrendingDown className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold tabular-nums tracking-tight min-[400px]:text-2xl">
              {formatMoney(s.totalExpenses)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{exHint}</p>
          </CardContent>
        </Card>
      </motion.div>
      <motion.div {...cardMotion} transition={{ delay: 0.15 }}>
        <Card
          className={cn(
            "overflow-hidden border shadow-sm transition-shadow hover:shadow-md",
            s.netBalance >= 0
              ? "border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-card"
              : "border-rose-500/25 bg-gradient-to-br from-rose-500/10 to-card"
          )}
        >
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-1">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("net")}
              </CardTitle>
            </div>
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl",
                s.netBalance >= 0
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
              )}
            >
              <Wallet className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                "text-xl font-bold tabular-nums tracking-tight min-[400px]:text-2xl",
                s.netBalance >= 0
                  ? "text-emerald-800 dark:text-emerald-200"
                  : "text-rose-800 dark:text-rose-200"
              )}
            >
              {formatMoney(s.netBalance)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t("netHint")}</p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export const SummaryCards = memo(SummaryCardsInner);
