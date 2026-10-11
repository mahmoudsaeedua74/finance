import { jsPDF } from "jspdf";
import type { MonthlyReportDto } from "@/types/report";

const MARGIN = 16;
const PAGE_W = 210;
/** Same brand as `_reports` / project HTML PDFs — MAHMOUD SAEED blue. */
const BRAND = { r: 78, g: 69, b: 228 } as const; // #4E45E4
const BRAND_DARK = { r: 66, g: 55, b: 202 } as const; // #4237CA
const INK = { r: 30, g: 30, b: 30 } as const;
const MUTED = { r: 107, g: 114, b: 128 } as const;

/**
 * Monthly report PDF — chrome aligned with MAHMOUD SAEED report template
 * (blue identity bar, ink tables, brand accents).
 */
export function createMonthlyReportPdf(data: MonthlyReportDto): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const m = data.month;
  const y = data.year;
  const label = `${y}-${String(m).padStart(2, "0")}`;
  const { summary, insights, incomeByType, expenseByCategory, expenseLineItems } = data;
  const pageBottom = 278;
  const lineH = 5.5;
  const sectionGap = 4;
  let yPos = 0;
  let pageNum = 1;

  const drawChrome = () => {
    doc.setDrawColor(BRAND.r, BRAND.g, BRAND.b);
    doc.setLineWidth(0.45);
    doc.line(MARGIN, 14, PAGE_W - MARGIN, 14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
    doc.text("MAHMOUD SAEED", MARGIN, 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text("Monthly report", PAGE_W - MARGIN, 11, { align: "right" });
  };

  const drawPageNum = () => {
    doc.setFontSize(8);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text(`Page ${pageNum}`, PAGE_W / 2, 290, { align: "center" });
  };

  const ensureSpace = (h: number) => {
    if (yPos + h > pageBottom) {
      drawPageNum();
      doc.addPage();
      pageNum += 1;
      drawChrome();
      yPos = 22;
    }
  };

  const setBody = () => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(INK.r, INK.g, INK.b);
  };

  drawChrome();
  yPos = 22;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(INK.r, INK.g, INK.b);
  doc.text(`Monthly report — ${label}`, MARGIN, yPos);
  yPos += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text("Personal Finance · income, spend, and net", MARGIN, yPos);
  yPos += 8;

  // Meta box
  doc.setFillColor(248, 249, 250);
  doc.setDrawColor(229, 231, 235);
  doc.rect(MARGIN, yPos, PAGE_W - 2 * MARGIN, 8, "FD");
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(PAGE_W - MARGIN - 1.2, yPos, 1.2, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.text(`Period ${label}`, MARGIN + 3, yPos + 5.2);
  yPos += 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(INK.r, INK.g, INK.b);
  doc.setDrawColor(BRAND.r, BRAND.g, BRAND.b);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, yPos - 3.5, MARGIN + 1.2, yPos + 1);
  doc.text("Summary at a glance", MARGIN + 4, yPos);
  yPos += 7;

  const endX = PAGE_W - MARGIN;
  const rowPair = (
    labelText: string,
    value: string,
    style?: { valueBold?: boolean; valueColor?: [number, number, number] }
  ) => {
    ensureSpace(lineH);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text(labelText, MARGIN, yPos);
    if (style?.valueColor) {
      doc.setTextColor(...style.valueColor);
    } else {
      doc.setTextColor(INK.r, INK.g, INK.b);
    }
    if (style?.valueBold) {
      doc.setFont("helvetica", "bold");
    }
    doc.text(value, endX, yPos, { align: "right" });
    doc.setFont("helvetica", "normal");
    yPos += lineH;
  };
  const fmt = (n: number) => n.toFixed(2);
  rowPair("Total income", fmt(summary.totalIncome), {
    valueBold: true,
    valueColor: [BRAND.r, BRAND.g, BRAND.b],
  });
  rowPair("Total expenses", fmt(summary.totalExpenses), { valueBold: true });
  rowPair("Net balance", fmt(summary.netBalance), {
    valueBold: true,
    valueColor:
      summary.netBalance >= 0
        ? [BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b]
        : [180, 83, 9],
  });
  setBody();
  rowPair("Project income", fmt(summary.projectIncome));
  yPos += 2;

  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, yPos, PAGE_W - MARGIN, yPos);
  yPos += sectionGap + 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(INK.r, INK.g, INK.b);
  doc.text("Insights", MARGIN + 4, yPos);
  yPos += 6;
  setBody();
  if (insights.overspent) {
    doc.setTextColor(180, 83, 9);
  } else {
    doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
  }
  const insight1 = insights.overspent
    ? "Expenses exceed income for this period."
    : "Spending is within or below your income. Nice work.";
  const lines = doc.splitTextToSize(insight1, PAGE_W - 2 * MARGIN);
  for (const ln of lines) {
    ensureSpace(lineH);
    doc.text(ln, MARGIN, yPos);
    yPos += lineH - 1;
  }
  setBody();
  doc.setTextColor(60, 60, 60);
  if (insights.biggestExpenseCategory) {
    yPos += 1;
    ensureSpace(lineH);
    doc.text(
      `Largest category: ${insights.biggestExpenseCategory.name} (${fmt(insights.biggestExpenseCategory.amount)})`,
      MARGIN,
      yPos
    );
    yPos += lineH;
  } else {
    yPos += 1;
    ensureSpace(lineH);
    doc.text("No expense categories in this view.", MARGIN, yPos);
    yPos += lineH;
  }
  yPos += 1;
  ensureSpace(lineH);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.text("Money after expenses (left): " + fmt(insights.moneyLeft), MARGIN, yPos);
  yPos += lineH + sectionGap;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(INK.r, INK.g, INK.b);
  doc.text("Income breakdown", MARGIN + 4, yPos);
  yPos += 6;
  setBody();
  const incomeKeys = Object.keys(incomeByType);
  if (incomeKeys.length === 0) {
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text("No income in this month.", MARGIN, yPos);
    yPos += lineH;
  } else {
    for (const k of incomeKeys) {
      ensureSpace(lineH);
      const row = `  ${k}    ${fmt(incomeByType[k])}`;
      const split = doc.splitTextToSize(row, PAGE_W - 2 * MARGIN - 4);
      for (const s of split) {
        ensureSpace(lineH);
        doc.setTextColor(INK.r, INK.g, INK.b);
        doc.text(s, MARGIN + 2, yPos);
        yPos += lineH - 0.5;
      }
    }
  }
  yPos += 3;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(INK.r, INK.g, INK.b);
  doc.text("Expenses by category", MARGIN + 4, yPos);
  yPos += 6;
  setBody();
  const expKeys = Object.keys(expenseByCategory);
  if (expKeys.length === 0) {
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    ensureSpace(lineH);
    doc.text("No expenses in this month.", MARGIN, yPos);
    yPos += lineH;
  } else {
    for (const k of expKeys) {
      ensureSpace(lineH);
      doc.setTextColor(INK.r, INK.g, INK.b);
      doc.text(`  ${k}`, MARGIN + 2, yPos);
      doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
      doc.setFont("helvetica", "bold");
      doc.text(fmt(expenseByCategory[k]), PAGE_W - MARGIN - 2, yPos, {
        align: "right",
      } as { align: "right" });
      doc.setFont("helvetica", "normal");
      yPos += lineH;
    }
  }

  yPos += 4;
  if (expenseLineItems.length > 0) {
    ensureSpace(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(INK.r, INK.g, INK.b);
    doc.text("Expense lines (detail)", MARGIN + 4, yPos);
    yPos += 5;
    setBody();
    doc.setFontSize(8);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    ensureSpace(4);
    doc.text("Date      Title    Category   Type   Amount", MARGIN, yPos);
    yPos += 4;
    doc.setDrawColor(229, 231, 235);
    doc.line(MARGIN, yPos, PAGE_W - MARGIN, yPos);
    yPos += 3;
    doc.setFontSize(7.5);
    for (const e of expenseLineItems) {
      const dt = new Date(e.date).toISOString().slice(0, 10);
      const one = `${dt}  ${e.title}  [${e.category}]  ${e.source}  ${fmt(e.amount)}`;
      const parts = doc.splitTextToSize(one, PAGE_W - 2 * MARGIN);
      for (const p of parts) {
        ensureSpace(4.5);
        doc.setTextColor(50, 50, 50);
        doc.text(p, MARGIN, yPos);
        yPos += 3.5;
      }
    }
  }

  // Last-page footer (Magdy / report-template pattern)
  ensureSpace(22);
  yPos = Math.max(yPos + 6, pageBottom - 18);
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, yPos, PAGE_W - MARGIN, yPos);
  yPos += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(INK.r, INK.g, INK.b);
  doc.text("MAHMOUD SAEED", MARGIN, yPos);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text("Personal Finance · monthly closing", MARGIN, yPos + 4);
  doc.text("Generated " + new Date().toISOString().slice(0, 10), PAGE_W - MARGIN, yPos, {
    align: "right",
  });

  drawPageNum();

  return doc;
}

export function monthlyReportPdfToBuffer(data: MonthlyReportDto): Buffer {
  const doc = createMonthlyReportPdf(data);
  const ab = doc.output("arraybuffer") as ArrayBuffer;
  return Buffer.from(new Uint8Array(ab));
}
