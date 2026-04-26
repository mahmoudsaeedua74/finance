import { createMonthlyReportPdf } from "@/lib/monthly-report-pdf";
import type { MonthlyReportDto } from "@/types/report";

/**
 * Downloads the styled monthly report PDF in the browser.
 */
export function exportMonthlyReportPdf(
  data: MonthlyReportDto,
  filename = "monthly-report.pdf"
) {
  const doc = createMonthlyReportPdf(data);
  doc.save(filename);
}
