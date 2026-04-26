"use client";

import { useQuery } from "@tanstack/react-query";
import { jsonFetch } from "@/lib/fetcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";

type GoalRow = {
  _id: string;
  name: string;
  targetAmount: number;
  totalSaved: number;
  percentage: number;
};

export function GoalsWidget() {
  const { data } = useQuery({
    queryKey: ["goals"],
    queryFn: () => jsonFetch<{ data: GoalRow[] }>("/api/goals"),
  });

  const goals = data?.data ?? [];
  if (!goals.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Goals</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {goals.slice(0, 4).map((g) => (
          <div key={g._id} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span>{g.name}</span>
              <span className="text-muted-foreground">{g.percentage.toFixed(0)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary" style={{ width: `${g.percentage}%` }} />
            </div>
            <div className="text-xs text-muted-foreground">
              {formatMoney(g.totalSaved)} / {formatMoney(g.targetAmount)}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
