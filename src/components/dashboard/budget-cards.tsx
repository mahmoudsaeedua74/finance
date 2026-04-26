"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useMonth } from "@/context/month-context";
import { isPresetExpenseCategory } from "@/lib/expense-categories";
import { jsonFetch } from "@/lib/fetcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";

type BudgetUsage = {
  category: string;
  limit: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: "safe" | "warning" | "over";
};

function statusClass(status: BudgetUsage["status"]) {
  if (status === "over") return "bg-destructive";
  if (status === "warning") return "bg-amber-500";
  return "bg-emerald-500";
}

export function BudgetCards() {
  const t = useTranslations("dashboard");
  const tCat = useTranslations("expense.categories");
  const { year, month } = useMonth();
  const { data } = useQuery({
    queryKey: ["budgets-usage", year, month],
    queryFn: () => jsonFetch<{ data: { rows: BudgetUsage[] } }>(`/api/budgets/usage?year=${year}&month=${month}`),
  });

  const rows = data?.data.rows ?? [];
  if (!rows.length) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.slice(0, 3).map((r) => (
        <Card key={r.category}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm capitalize">
              {isPresetExpenseCategory(r.category) ? tCat(r.category) : r.category}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm text-muted-foreground">
              {formatMoney(r.spent)} / {formatMoney(r.limit)}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className={`h-full ${statusClass(r.status)}`} style={{ width: `${Math.min(100, r.percentage)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">
              {t("budgetRemaining", { amount: formatMoney(r.remaining) })}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
