"use client";

import { useQuery } from "@tanstack/react-query";
import { useMonth } from "@/context/month-context";
import { jsonFetch } from "@/lib/fetcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";

export function ForecastWidget() {
  const { year, month } = useMonth();
  const { data } = useQuery({
    queryKey: ["forecast", year, month],
    queryFn: () => jsonFetch<{ data: { expectedIncome: number; expectedExpenses: number; expectedSavings: number } }>(`/api/forecast?year=${year}&month=${month}`),
  });
  const f = data?.data;
  if (!f) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Forecast (next month)</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground">Expected income</p>
          <p className="font-semibold">{formatMoney(f.expectedIncome)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Expected expenses</p>
          <p className="font-semibold">{formatMoney(f.expectedExpenses)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Expected savings</p>
          <p className="font-semibold">{formatMoney(f.expectedSavings)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
