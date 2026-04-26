import { useQuery } from "@tanstack/react-query";
import { formatMoney } from "@/lib/format";
import { jsonFetch } from "@/lib/fetcher";
import { queryKeys } from "@/features/_lib/query-keys";
import type { MonthlyReportDto } from "@/types/report";

/** All-time (ledger) net, for the shell header / sidebar. */
export function useLedgerNetDisplay() {
  const { data } = useQuery({
    queryKey: queryKeys.ledgerReport(),
    queryFn: () =>
      jsonFetch<{ data: MonthlyReportDto }>("/api/summary/ledger"),
  });
  const net = data?.data?.summary.netBalance;
  return net != null ? formatMoney(net) : "…";
}
