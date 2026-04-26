export function renderDigestEmail(input: {
  appName?: string;
  totalSpent: number;
  remainingBalance: number;
  warnings: string[];
  insights: string[];
}) {
  const appName = input.appName || "Personal Finance";
  const warningHtml = input.warnings.map((w) => `<li>${w}</li>`).join("");
  const insightHtml = input.insights.map((i) => `<li>${i}</li>`).join("");
  const html = `
    <div style="font-family: Arial, sans-serif; line-height:1.5">
      <h2>${appName} - Weekly digest</h2>
      <p>Total spent: ${input.totalSpent.toFixed(2)}</p>
      <p>Remaining balance: ${input.remainingBalance.toFixed(2)}</p>
      <h3>Warnings</h3>
      <ul>${warningHtml || "<li>None</li>"}</ul>
      <h3>Insights</h3>
      <ul>${insightHtml || "<li>None</li>"}</ul>
    </div>
  `;
  const text = `${appName} digest\nSpent: ${input.totalSpent.toFixed(2)}\nRemaining: ${input.remainingBalance.toFixed(2)}`;
  return { html, text };
}
