"use client";

import { useQuery } from "@tanstack/react-query";
import { jsonFetch } from "@/lib/fetcher";

export type ReportFilterType = "monthly" | "yearly" | "all";

export type ReportSummaryResponse = {
  filter: ReportFilterType;
  period: { start: string; end: string } | null;
  summary: {
    totalIncome: number;
    totalExpense: number;
    netBalance: number;
  };
};

export function useReports(filter: ReportFilterType) {
  return useQuery({
    queryKey: ["reports-summary", filter],
    queryFn: () =>
      jsonFetch<{ data: ReportSummaryResponse }>(`/api/reports?filter=${filter}`),
  });
}
