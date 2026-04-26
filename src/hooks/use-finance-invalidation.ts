import { useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useMonth } from "@/context/month-context";

/**
 * Centralizes React Query invalidation for finance entities and the monthly report
 * so list + form mutations stay consistent.
 */
export function useFinanceInvalidation() {
  const qc = useQueryClient();
  const { year, month } = useMonth();

  return useMemo(
    () => ({
      invalidateReport: () => {
        void qc.invalidateQueries({ queryKey: ["report", year, month] });
      },
      /** Match `/income/new`: broad `incomes` key plus the current month report. */
      invalidateIncomes: (options?: { allQueries?: boolean }) => {
        if (options?.allQueries) {
          void qc.invalidateQueries({ queryKey: ["incomes"] });
        } else {
          void qc.invalidateQueries({ queryKey: ["incomes", year, month] });
        }
        void qc.invalidateQueries({ queryKey: ["report", year, month] });
      },
      /**
       * @param options.includeAllList — also refresh the unscoped expenses list (templates, etc.).
       */
      invalidateExpenses: (options?: { includeAllList?: boolean }) => {
        void qc.invalidateQueries({ queryKey: ["expenses", year, month] });
        if (options?.includeAllList) {
          void qc.invalidateQueries({ queryKey: ["expenses", "all"] });
        }
        void qc.invalidateQueries({ queryKey: ["report", year, month] });
      },
      invalidateProjects: () => {
        void qc.invalidateQueries({ queryKey: ["projects", year, month] });
        void qc.invalidateQueries({ queryKey: ["projects", "all"] });
        void qc.invalidateQueries({ queryKey: ["report", year, month] });
      },
    }),
    [qc, year, month]
  );
}
