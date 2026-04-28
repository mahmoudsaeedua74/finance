"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useReports, type ReportFilterType } from "@/hooks/use-reports";
import { formatMoney } from "@/lib/format";

const tabs: ReportFilterType[] = ["monthly", "yearly", "all"];

export function ReportsRangeSummary() {
  const [filter, setFilter] = useState<ReportFilterType>("monthly");
  const q = useReports(filter);
  const s = q.data?.data.summary;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reports (Monthly / Yearly / All-Time)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <Button
              key={t}
              type="button"
              variant={filter === t ? "default" : "outline"}
              onClick={() => setFilter(t)}
            >
              {t}
            </Button>
          ))}
        </div>
        {!s ? (
          <p className="text-sm text-muted-foreground">{q.isLoading ? "Loading…" : "No data."}</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Income</p>
              <p className="text-lg font-semibold tabular-nums">{formatMoney(s.totalIncome)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Expense</p>
              <p className="text-lg font-semibold tabular-nums">{formatMoney(s.totalExpense)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Net</p>
              <p className="text-lg font-semibold tabular-nums">{formatMoney(s.netBalance)}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
