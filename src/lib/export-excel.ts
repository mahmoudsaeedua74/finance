import * as XLSX from "xlsx";
import type { MonthlyReportDto } from "@/types/report";
import { toLocalYmd } from "@/lib/ymd";

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
    ["Date", "Title", "Method", "Amount"],
    ...data.incomeLineItems.map((i) => [
      new Date(i.date).toISOString().slice(0, 10),
      i.title,
      i.paymentMethod ?? "",
      i.amount,
    ]),
  ];

  const projectRows: (string | number)[][] = [
    ["Date", "Project", "Method", "Amount"],
    ...data.projectLineItems.map((p) => [
      new Date(p.date).toISOString().slice(0, 10),
      p.name,
      p.paymentMethod ?? "",
      p.amount,
    ]),
  ];

  const expenseRows: (string | number)[][] = [
    ["Date", "Title", "Category", "Method", "Amount"],
    ...data.expenseLineItems.map((e) => [
      new Date(e.date).toISOString().slice(0, 10),
      e.title,
      e.category,
      e.paymentMethod ?? "",
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

export type PayoutLineExportRow = {
  date: string;
  projectName: string;
  methodLabel: string;
  amount: number;
};

/**
 * One sheet: date, project, payment method, amount. Newest first, with a total.
 */
export function exportProjectPayoutLinesExcel(
  rows: PayoutLineExportRow[],
  options: {
    filename?: string;
    sheetName: string;
    headers: { date: string; project: string; method: string; amount: string; total: string };
    rtl?: boolean;
  }
) {
  const headers = options.headers;
  const aoa: (string | number)[][] = [
    [headers.date, headers.project, headers.method, headers.amount],
    ...rows.map((r) => [
      toLocalYmd(new Date(r.date)),
      r.projectName,
      r.methodLabel,
      r.amount,
    ]),
  ];
  const total = rows.reduce((s, r) => s + r.amount, 0);
  aoa.push(["", headers.total, "", total]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{ wch: 14 }, { wch: 36 }, { wch: 16 }, { wch: 16 }];
  if (rows.length > 0) {
    ws["!autofilter"] = { ref: `A1:D${rows.length + 1}` };
  }
  const wb = XLSX.utils.book_new();
  if (options.rtl) {
    wb.Workbook = { Views: [{ RTL: true }] };
  }
  const sheetName = options.sheetName.slice(0, 31) || "Payouts";
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, options.filename ?? "project-payouts.xlsx");
}

export type TransactionExportRow = {
  date: string;
  title: string;
  categoryLabel: string;
  kindLabel: string;
  directionLabel: string;
  amount: number;
};

/**
 * Single-sheet export of the current transactions view (filtered list).
 */
export function exportTransactionsExcel(rows: TransactionExportRow[], filename = "transactions.xlsx") {
  const aoa = [
    ["Date", "Title", "Category", "Type", "Direction", "Amount"],
    ...rows.map((r) => [
      new Date(r.date).toISOString().slice(0, 10),
      r.title,
      r.categoryLabel,
      r.kindLabel,
      r.directionLabel,
      r.amount,
    ]),
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "Transactions");
  XLSX.writeFile(wb, filename);
}
