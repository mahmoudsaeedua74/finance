import { subMonths } from "date-fns";
import { getMonthExpenseTotal, getMonthSalaryTotal } from "@/lib/services/month-rollup";
import type { SmartInsightDto } from "@/types/report";

/**
 * “رؤى سريعة”: بتركّز على **راتب** الشهر (نوع `salary`) دون جمعية أو باقي الأنواع.
 */
export async function buildSmartInsights(
  userId: string,
  year: number,
  month: number
): Promise<SmartInsightDto[]> {
  const [salary, expenses] = await Promise.all([
    getMonthSalaryTotal(userId, year, month),
    getMonthExpenseTotal(userId, year, month),
  ]);
  const prev = subMonths(new Date(year, month - 1, 1), 1);
  const py = prev.getFullYear();
  const pm = prev.getMonth() + 1;
  const [prevSalary, prevExpenses] = await Promise.all([
    getMonthSalaryTotal(userId, py, pm),
    getMonthExpenseTotal(userId, py, pm),
  ]);

  const out: SmartInsightDto[] = [];
  if (salary <= 0) {
    out.push({ kind: "noSalary" });
  } else {
    const left = salary - expenses;
    if (left >= 0) {
      out.push({ kind: "leftFromSalary", left, expenses });
    } else {
      out.push({ kind: "overVsSalary", over: -left, expenses, salary });
    }
    const spendPct = (expenses / salary) * 100;
    if (spendPct > 0.5) {
      out.push({ kind: "spendShareOfSalary", pct: Math.round(spendPct) });
    }
  }
  if (prevExpenses > 0) {
    const d = expenses - prevExpenses;
    const deltaPct = (d / prevExpenses) * 100;
    if (Math.abs(deltaPct) >= 10) {
      if (d > 0) out.push({ kind: "expensesUp", pct: Math.round(Math.abs(deltaPct)) });
      else out.push({ kind: "expensesDown", pct: Math.round(Math.abs(deltaPct)) });
    }
  }
  if (salary > 0 && prevSalary > 0) {
    const ds = salary - prevSalary;
    const dsp = (ds / prevSalary) * 100;
    if (Math.abs(dsp) >= 5) {
      out.push({ kind: "salaryVsPrev", pct: Math.round(dsp) });
    }
  }
  return out.slice(0, 5);
}
