import { useQuery } from "@tanstack/react-query";
import { useMonth } from "@/context/month-context";
import { formatMoney } from "@/lib/format";
import { jsonFetch } from "@/lib/fetcher";
import type { MonthlyReportDto } from "@/types/report";

/** Formatted net balance for the selected month (for headers / month bar). */
export function useMonthNetBalanceDisplay() {
  const { year, month } = useMonth();
  const { data } = useQuery({
    queryKey: ["report", year, month],
    queryFn: () =>
      jsonFetch<{ data: MonthlyReportDto }>(
        `/api/reports/monthly?year=${year}&month=${month}`,
      ),
  });
  const net = data?.data.summary.netBalance;
  return net != null ? formatMoney(net) : "…";
}
