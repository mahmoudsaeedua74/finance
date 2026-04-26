import { jsPDF } from "jspdf";
import type { MonthlyReportDto } from "@/types/report";

const MARGIN = 18;
const PAGE_W = 210;
const COL_GOLD = { r: 15, g: 118, b: 110 } as const; // teal-600-ish

/**
 * Rich layout for on-screen / print / email PDF (no doc.save — works in Node & browser).
 */
export function createMonthlyReportPdf(data: MonthlyReportDto): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const m = data.month;
  const y = data.year;
  const label = `${y}-${String(m).padStart(2, "0")}`;
  const { summary, insights, incomeByType, expenseByCategory, expenseLineItems } = data;
  const pageBottom = 285;
  const lineH = 5.5;
  const sectionGap = 4;
  let yPos = 0;

  const ensureSpace = (h: number) => {
    if (yPos + h > pageBottom) {
      doc.addPage();
      yPos = 18;
    }
  };

  const setBody = () => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(40, 40, 40);
  };

  // Header bar
  doc.setFillColor(COL_GOLD.r, COL_GOLD.g, COL_GOLD.b);
  doc.rect(0, 0, PAGE_W, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Personal Finance", MARGIN, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Monthly report · ${label}`, MARGIN, 22);

  yPos = 36;
  setBody();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text("Summary at a glance", MARGIN, yPos);
  yPos += 7;

  const endX = PAGE_W - MARGIN;
  const rowPair = (label: string, value: string, style?: { valueBold?: boolean; valueColor?: [number, number, number] }) => {
    ensureSpace(lineH);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    doc.text(label, MARGIN, yPos);
    if (style?.valueColor) {
      doc.setTextColor(...style.valueColor);
    } else {
      doc.setTextColor(30, 30, 30);
    }
    if (style?.valueBold) {
      doc.setFont("helvetica", "bold");
    }
    doc.text(value, endX, yPos, { align: "right" });
    doc.setFont("helvetica", "normal");
    yPos += lineH;
  };
  const fmt = (n: number) => n.toFixed(2);
  rowPair("Total income", fmt(summary.totalIncome), { valueBold: true });
  rowPair("Total expenses", fmt(summary.totalExpenses), { valueBold: true });
  rowPair("Net balance", fmt(summary.netBalance), {
    valueBold: true,
    valueColor: summary.netBalance >= 0 ? [15, 118, 110] : [180, 50, 50],
  });
  setBody();
  doc.setTextColor(40, 40, 40);
  rowPair("Project income", fmt(summary.projectIncome));
  yPos += 2;

  doc.setDrawColor(220, 220, 220);
  doc.line(MARGIN, yPos, PAGE_W - MARGIN, yPos);
  yPos += sectionGap + 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Insights", MARGIN, yPos);
  yPos += 6;
  setBody();
  if (insights.overspent) {
    doc.setTextColor(180, 40, 40);
  } else {
    doc.setTextColor(15, 118, 110);
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
  doc.setTextColor(30, 30, 30);
  doc.text("Money after expenses (left): " + fmt(insights.moneyLeft), MARGIN, yPos);
  yPos += lineH + sectionGap;

  // Income breakdown
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text("Income breakdown", MARGIN, yPos);
  yPos += 6;
  setBody();
  const incomeKeys = Object.keys(incomeByType);
  if (incomeKeys.length === 0) {
    doc.setTextColor(120, 120, 120);
    doc.text("No income in this month.", MARGIN, yPos);
    yPos += lineH;
  } else {
    for (const k of incomeKeys) {
      ensureSpace(lineH);
      const row = `  ${k}    ${fmt(incomeByType[k])}`;
      const split = doc.splitTextToSize(row, PAGE_W - 2 * MARGIN - 4);
      for (const s of split) {
        ensureSpace(lineH);
        doc.setTextColor(40, 40, 40);
        doc.text(s, MARGIN + 2, yPos);
        yPos += lineH - 0.5;
      }
    }
  }
  yPos += 3;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Expenses by category", MARGIN, yPos);
  yPos += 6;
  setBody();
  const expKeys = Object.keys(expenseByCategory);
  if (expKeys.length === 0) {
    doc.setTextColor(120, 120, 120);
    ensureSpace(lineH);
    doc.text("No expenses in this month.", MARGIN, yPos);
    yPos += lineH;
  } else {
    for (const k of expKeys) {
      ensureSpace(lineH);
      doc.setTextColor(40, 40, 40);
      doc.text(`  ${k}`, MARGIN + 2, yPos);
      doc.text(fmt(expenseByCategory[k]), PAGE_W - MARGIN - 2, yPos, { align: "right" } as { align: "right" });
      yPos += lineH;
    }
  }

  yPos += 4;
  if (expenseLineItems.length > 0) {
    ensureSpace(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text("Expense lines (detail)", MARGIN, yPos);
    yPos += 5;
    setBody();
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    ensureSpace(4);
    doc.text("Date      Title    Category   Type   Amount", MARGIN, yPos);
    yPos += 4;
    doc.setDrawColor(230, 230, 230);
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

  // Footer
  const footY = 292;
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(
    "Generated by Personal Finance · " + new Date().toISOString().slice(0, 10),
    MARGIN,
    footY
  );

  return doc;
}

export function monthlyReportPdfToBuffer(data: MonthlyReportDto): Buffer {
  const doc = createMonthlyReportPdf(data);
  const ab = doc.output("arraybuffer") as ArrayBuffer;
  return Buffer.from(new Uint8Array(ab));
}
