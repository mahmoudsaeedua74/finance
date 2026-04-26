import * as XLSX from "xlsx";
import type { MonthlyReportDto } from "@/types/report";

/**
 * Exports a monthly report workbook (.xlsx) in the browser.
 */
export function exportMonthlyReportExcel(
  data: MonthlyReportDto,
  filename = "monthly-report.xlsx"
) {
  const y = data.year;
  const m = data.month;
  const title = `Report ${y}-${String(m).padStart(2, "0")}`;

  const summaryAoa: (string | number)[][] = [
    ["Key", "Value"],
    ["Total income", data.summary.totalIncome],
    ["Total expenses", data.summary.totalExpenses],
    ["Net balance", data.summary.netBalance],
  ];

  const incomeRows: (string | number)[][] = [
    ["Date", "Title", "Type", "Amount"],
    ...data.incomeLineItems.map((i) => [
      new Date(i.date).toISOString().slice(0, 10),
      i.title,
      i.incomeType,
      i.amount,
    ]),
  ];

  const projectRows: (string | number)[][] = [
    ["Date", "Project", "Amount", "Note"],
    ...data.projectLineItems.map((p) => [
      new Date(p.date).toISOString().slice(0, 10),
      p.name,
      p.amount,
      p.note ?? "",
    ]),
  ];

  const expenseRows: (string | number)[][] = [
    ["Date", "Title", "Category", "Type", "Project", "Amount"],
    ...data.expenseLineItems.map((e) => [
      new Date(e.date).toISOString().slice(0, 10),
      e.title,
      e.category,
      e.source,
      e.projectName ?? "",
      e.amount,
    ]),
  ];

  const catRows: (string | number)[][] = [
    ["Category", "Amount"],
    ...Object.entries(data.expenseByCategory).map(([k, v]) => [k, v]),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      [title],
      [""],
      ...summaryAoa,
    ]),
    "Summary"
  );
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(incomeRows), "Income");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(projectRows), "Projects");
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(expenseRows),
    "Expenses"
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(catRows),
    "By category"
  );
  XLSX.writeFile(wb, filename);
}

/**
 * One sheet: all projects in any shape (e.g. all-time list).
 */
export function exportProjectListExcel(
  rows: { name: string; amount: number; date: string; note?: string }[],
  filename = "projects.xlsx"
) {
  const aoa = [
    ["Date", "Project", "Amount", "Note"],
    ...rows.map((r) => [
      new Date(r.date).toISOString().slice(0, 10),
      r.name,
      r.amount,
      r.note?.trim() ?? "",
    ]),
  ];
  const total = rows.reduce((s, r) => s + r.amount, 0);
  aoa.push(["", "Total", total]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "Projects");
  XLSX.writeFile(wb, filename);
}
