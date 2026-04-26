import type { MonthlyReportDto } from "@/types/report";

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const fmt = (n: number) => n.toFixed(2);

/**
 * HTML body for the monthly report email; plain-text clients still get a separate part.
 */
export function buildMonthlyReportEmailHtml(
  data: MonthlyReportDto,
  opts?: { appName?: string }
): string {
  const name = opts?.appName ?? "Personal Finance";
  const { year, month, summary, insights, incomeByType, expenseByCategory } = data;
  const period = `${year}-${String(month).padStart(2, "0")}`;
  const row = (a: string, b: string) =>
    `<tr><td style="padding:6px 0;border-bottom:1px solid #eee;font-family:system-ui,Segoe UI,sans-serif;font-size:14px;color:#333">${esc(
      a
    )}</td><td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;font-weight:600;font-family:ui-monospace,monospace;font-size:14px;color:#111">${esc(
      b
    )}</td></tr>`;

  const incomeRows = Object.entries(incomeByType)
    .map(([k, v]) => row(k, fmt(v)))
    .join("");

  const expRows = Object.entries(expenseByCategory)
    .map(([k, v]) => row(k, fmt(v)))
    .join("");

  const insightText = insights.overspent
    ? "This month your <strong>expenses were higher than income</strong> — worth reviewing spending."
    : "Your spending is <strong>within or below</strong> your income. Keep it up.";

  const topCat =
    insights.biggestExpenseCategory != null
      ? `<p style="margin:12px 0 0;font-size:14px;color:#555">Largest category: <strong>${esc(
          insights.biggestExpenseCategory.name
        )}</strong> (${fmt(insights.biggestExpenseCategory.amount)})</p>`
      : `<p style="margin:12px 0 0;font-size:14px;color:#777">No expenses recorded for this view.</p>`;

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:24px 12px">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.07);font-family:system-ui,Segoe UI,sans-serif">
          <tr>
            <td style="background:linear-gradient(135deg,#0d9488 0%,#0f766e 100%);color:#fff;padding:28px 24px 22px">
              <h1 style="margin:0;font-size:22px;font-weight:700;letter-spacing:-.02em">${esc(name)}</h1>
              <p style="margin:8px 0 0;font-size:15px;opacity:.95">Your monthly report · <strong>${esc(
                period
              )}</strong></p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 24px 8px">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#3f3f46">
                Here’s a quick summary for <strong>${esc(period)}</strong>. A detailed PDF is attached for your records.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 8px">
              <h2 style="margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#71717a">At a glance</h2>
              <table width="100%" cellspacing="0" style="border-collapse:collapse">
                ${row("Total income", fmt(summary.totalIncome))}
                ${row("Total expenses", fmt(summary.totalExpenses))}
                ${row(
                  "Net balance",
                  fmt(summary.netBalance)
                )}
                ${row("Project income", fmt(summary.projectIncome))}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 8px">
              <h2 style="margin:0 0 6px;font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#71717a">Insights</h2>
              <p style="margin:0;font-size:15px;line-height:1.55;color:#3f3f46">${insightText}</p>
              ${topCat}
              <p style="margin:12px 0 0;font-size:14px;color:#555">Money left after expenses: <strong style="color:${
                insights.moneyLeft >= 0 ? "#0d9488" : "#b91c1c"
              }">${fmt(insights.moneyLeft)}</strong></p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 0">
              <h2 style="margin:0 0 6px;font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#71717a">Income</h2>
              <table width="100%" cellspacing="0" style="border-collapse:collapse">
                ${
                  incomeRows ||
                  `<tr><td colspan="2" style="padding:8px 0;font-size:14px;color:#9ca3af">No income this month.</td></tr>`
                }
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 24px">
              <h2 style="margin:0 0 6px;font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#71717a">Expenses by category</h2>
              <table width="100%" cellspacing="0" style="border-collapse:collapse">
                ${
                  expRows ||
                  `<tr><td colspan="2" style="padding:8px 0;font-size:14px;color:#9ca3af">No expenses this month.</td></tr>`
                }
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#fafafa;border-top:1px solid #e4e4e7;padding:16px 24px">
              <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.45">
                The attachment is a full PDF (same layout you get from “Download PDF” in the app). This email was sent automatically.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
