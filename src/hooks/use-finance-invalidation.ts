import { useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { queryKeys } from "@/features/_lib/query-keys";

/**
 * Centralizes React Query invalidation for finance entities, ledger, and reports.
 */
export function useFinanceInvalidation() {
  const qc = useQueryClient();

  return useMemo(
    () => ({
      /** Refresh dashboard alerts (income/expense/project APIs may create rows). */
      invalidateNotifications: () => {
        void qc.invalidateQueries({ queryKey: queryKeys.notifications.root() });
      },
      /** Any monthly `GET /api/reports/monthly?…` (report month picker on /report). */
      invalidateReport: () => {
        void qc.invalidateQueries({ queryKey: ["report"] });
      },
      invalidateLedger: () => {
        void qc.invalidateQueries({ queryKey: queryKeys.ledgerReport() });
      },
      invalidateIncomes: () => {
        void qc.invalidateQueries({ queryKey: queryKeys.incomes.all() });
        void qc.invalidateQueries({ queryKey: queryKeys.recurringIncomes() });
        void qc.invalidateQueries({ queryKey: ["report"] });
        void qc.invalidateQueries({ queryKey: queryKeys.ledgerReport() });
        void qc.invalidateQueries({ queryKey: queryKeys.notifications.root() });
      },
      /**
       * @param options.includeAllList — also refresh template-only list keys.
       */
      invalidateExpenses: (options?: { includeAllList?: boolean }) => {
        void qc.invalidateQueries({ queryKey: ["expenses"] });
        if (options?.includeAllList) {
          void qc.invalidateQueries({ queryKey: queryKeys.expenses.all() });
        }
        void qc.invalidateQueries({ queryKey: ["report"] });
        void qc.invalidateQueries({ queryKey: queryKeys.ledgerReport() });
        void qc.invalidateQueries({ queryKey: queryKeys.notifications.root() });
      },
      invalidateProjects: () => {
        void qc.invalidateQueries({ queryKey: ["projects"] });
        void qc.invalidateQueries({ queryKey: queryKeys.ledgerReport() });
        void qc.invalidateQueries({ queryKey: ["report"] });
        void qc.invalidateQueries({ queryKey: queryKeys.notifications.root() });
      },
    }),
    [qc]
  );
}
