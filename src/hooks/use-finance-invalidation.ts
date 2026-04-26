import { useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useMonth } from "@/context/month-context";
import { queryKeys } from "@/features/_lib/query-keys";

/**
 * Centralizes React Query invalidation for finance entities and the monthly report
 * so list + form mutations stay consistent.
 */
export function useFinanceInvalidation() {
  const qc = useQueryClient();
  const { year, month } = useMonth();

  return useMemo(
    () => ({
      /** Refresh dashboard alerts (income/expense/project APIs may create rows). */
      invalidateNotifications: () => {
        void qc.invalidateQueries({ queryKey: queryKeys.notifications.root() });
      },
      invalidateReport: () => {
        void qc.invalidateQueries({ queryKey: queryKeys.report(year, month) });
      },
      /** Match `/income/new`: broad `incomes` key plus the current month report. */
      invalidateIncomes: (options?: { allQueries?: boolean }) => {
        if (options?.allQueries) {
          void qc.invalidateQueries({ queryKey: queryKeys.incomes.all() });
        } else {
          void qc.invalidateQueries({ queryKey: queryKeys.incomes.month(year, month) });
        }
        void qc.invalidateQueries({ queryKey: queryKeys.report(year, month) });
        void qc.invalidateQueries({ queryKey: queryKeys.notifications.root() });
      },
      /**
       * @param options.includeAllList — also refresh the unscoped expenses list (templates, etc.).
       */
      invalidateExpenses: (options?: { includeAllList?: boolean }) => {
        void qc.invalidateQueries({ queryKey: queryKeys.expenses.month(year, month) });
        if (options?.includeAllList) {
          void qc.invalidateQueries({ queryKey: queryKeys.expenses.all() });
        }
        void qc.invalidateQueries({ queryKey: queryKeys.report(year, month) });
        void qc.invalidateQueries({ queryKey: queryKeys.notifications.root() });
      },
      invalidateProjects: () => {
        void qc.invalidateQueries({ queryKey: queryKeys.projects.month(year, month) });
        void qc.invalidateQueries({ queryKey: queryKeys.projects.all() });
        void qc.invalidateQueries({ queryKey: queryKeys.projects.allForSpend() });
        void qc.invalidateQueries({ queryKey: queryKeys.projects.distinctNames() });
        void qc.invalidateQueries({ queryKey: ["projects", "summary"] });
        void qc.invalidateQueries({ queryKey: ["projects", "monthPl"] });
        void qc.invalidateQueries({ queryKey: queryKeys.report(year, month) });
        void qc.invalidateQueries({ queryKey: queryKeys.notifications.root() });
      },
    }),
    [qc, year, month]
  );
}
