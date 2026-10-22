"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { QueryErrorAlert } from "@/components/dashboard/query-error-alert";
import { PaymentMethodLabel, paymentMethodText } from "@/components/forms/payment-method-label";
import { LedgerTable } from "@/components/shared/ledger-table";
import { exportProjectPayoutLinesExcel } from "@/lib/export-excel";
import { jsonFetch } from "@/lib/fetcher";
import { formatDateDayMonth, formatMoney } from "@/lib/format";
import { buildProjectJobsFilterQueryString, type ProjectJobListFilters } from "@/lib/project-job-filters";
import type { ProjectPayoutLine } from "@/lib/services/freelance-project-service";

export function ProjectPayoutsPanel({ filters }: { filters: ProjectJobListFilters }) {
  const t = useTranslations("projects");
  const tC = useTranslations("common");
  const tW = useTranslations("wallet");
  const locale = useLocale();

  const queryString = useMemo(() => {
    const base = buildProjectJobsFilterQueryString(filters);
    return `${base}${base ? "&" : "?"}lines=payouts`;
  }, [filters]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["project-payout-lines", filters],
    queryFn: () => jsonFetch<{ data: ProjectPayoutLine[] }>(`/api/project-jobs${queryString}`),
    staleTime: 30_000,
  });

  const lines = data?.data ?? [];

  const methodLabel = (method: ProjectPayoutLine["paymentMethod"]) =>
    paymentMethodText(method, {
      cash: tW("methodCash"),
      card: tW("cardShort"),
      unspecified: "—",
    });

  const onExport = () => {
    exportProjectPayoutLinesExcel(
      lines.map((line) => ({
        date: line.date,
        projectName: line.projectName,
        methodLabel: methodLabel(line.paymentMethod),
        amount: line.amount,
      })),
      {
        filename: "project-payouts.xlsx",
        sheetName: t("viewPayouts"),
        headers: {
          date: tC("date"),
          project: tC("project"),
          method: tW("methodLabel"),
          amount: tC("amount"),
          total: t("payoutsTotal"),
        },
        rtl: locale === "ar",
      }
    );
    toast.success(t("payoutsXlsxOk"));
  };

  if (error) return <QueryErrorAlert error={error} />;

  if (isLoading) {
    return <DataTableSkeleton columnShapes={["sm", "fill", "sm", "end"]} rows={8} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{t("payoutsCount", { count: lines.length })}</p>
        <Button
          type="button"
          variant="outline"
          className="h-11 gap-2 px-3"
          onClick={onExport}
          disabled={lines.length === 0}
        >
          <Download className="size-4" aria-hidden />
          {t("payoutsExport")}
        </Button>
      </div>

      {lines.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          {t("payoutsEmpty")}
        </p>
      ) : (
        <LedgerTable
          caption={t("viewPayouts")}
          columns={[
            { id: "date", header: tC("date"), width: "22%", tone: "muted" },
            { id: "project", header: tC("project"), width: "34%", tone: "strong" },
            { id: "method", header: tW("methodLabel"), width: "22%" },
            { id: "amount", header: tC("amount"), width: "22%", align: "end", tone: "strong" },
          ]}
          rows={lines.map((line) => ({
            id: line.id,
            cells: {
              date: formatDateDayMonth(new Date(line.date), locale),
              project: line.projectName,
              method: (
                <PaymentMethodLabel method={line.paymentMethod} className="text-sm text-foreground" />
              ),
              amount: formatMoney(line.amount),
            },
          }))}
        />
      )}
    </div>
  );
}
