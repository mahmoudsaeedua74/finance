type MonthlyClosingInput = {
  appName: string;
  periodLabel: string;
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  biggestExpenseCategory?: { name: string; amount: number } | null;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

export function renderMonthlyClosingEmail(input: MonthlyClosingInput) {
  const netColor = input.netBalance >= 0 ? "#0f766e" : "#b91c1c";
  const biggest = input.biggestExpenseCategory
    ? `${input.biggestExpenseCategory.name} (${fmt(input.biggestExpenseCategory.amount)})`
    : "No clear top category";

  const subject = `${input.appName} — Monthly closing ${input.periodLabel}`;

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(135deg,#0f766e,#115e59);padding:18px 22px;color:#ffffff;">
                <div style="font-size:20px;font-weight:700;">${input.appName}</div>
                <div style="font-size:13px;opacity:.95;margin-top:4px;">Smart Monthly Closing · ${input.periodLabel}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 22px 6px;">
                <p style="margin:0 0 12px;font-size:14px;color:#334155;">
                  Your month is closed. See the highlights below and open the attached PDF for full details.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 22px 6px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0 8px;">
                  <tr>
                    <td style="font-size:13px;color:#64748b;">Total income</td>
                    <td align="right" style="font-size:15px;font-weight:700;color:#0f172a;">${fmt(input.totalIncome)}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#64748b;">Total expenses</td>
                    <td align="right" style="font-size:15px;font-weight:700;color:#0f172a;">${fmt(input.totalExpenses)}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#64748b;">Net balance</td>
                    <td align="right" style="font-size:16px;font-weight:800;color:${netColor};">${fmt(input.netBalance)}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#64748b;">Top spending category</td>
                    <td align="right" style="font-size:13px;font-weight:600;color:#334155;">${biggest}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 22px 22px;">
                <div style="font-size:12px;color:#94a3b8;">
                  This email is generated automatically at month start. PDF attachment includes full line-item details.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `${input.appName} — Smart Monthly Closing (${input.periodLabel})`,
    "",
    `Income: ${fmt(input.totalIncome)}`,
    `Expenses: ${fmt(input.totalExpenses)}`,
    `Net: ${fmt(input.netBalance)}`,
    `Top spending category: ${biggest}`,
    "",
    "The full PDF report is attached.",
  ].join("\n");

  return { subject, html, text };
}

