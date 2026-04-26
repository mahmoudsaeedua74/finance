"use client";

import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";
import type { MonthlyReportDto } from "@/types/report";

const ReportChartsInner = dynamic(
  () => import("./report-charts").then((m) => m.ReportCharts),
  {
    ssr: false,
    loading: () => (
      <div className="grid min-w-0 max-w-full grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
        <Card className="h-64 min-h-[16rem] w-full min-w-0 max-w-full border-border/60 bg-card/50 animate-pulse min-[400px]:h-80" />
        <Card className="h-64 min-h-[16rem] w-full min-w-0 max-w-full border-border/60 bg-card/50 animate-pulse min-[400px]:h-80" />
      </div>
    ),
  }
);

type Props = { report: MonthlyReportDto | undefined };

export function ReportChartsLazy({ report }: Props) {
  return <ReportChartsInner report={report} />;
}
