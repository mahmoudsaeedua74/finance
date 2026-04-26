"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonthlyReportDto } from "@/types/report";

export function SmartInsightsWidget({ report }: { report: MonthlyReportDto | undefined }) {
  const rows = report?.smartInsights ?? [];
  if (!rows.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Smart insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((r) => (
          <p key={r.key} className="text-sm text-muted-foreground">
            {r.message}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}
