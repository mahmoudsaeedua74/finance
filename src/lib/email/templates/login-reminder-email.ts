export function renderLoginReminderEmail(input: {
  appName?: string;
  userName?: string;
  /** Hours since last activity we counted as “opening the app”. */
  hoursSinceActivity?: number | null;
}) {
  const appName = input.appName || "Personal Finance";
  const greeting = input.userName?.trim() ? `Hi ${input.userName.trim()},` : "Hi,";
  const hint =
    input.hoursSinceActivity != null && Number.isFinite(input.hoursSinceActivity)
      ? `It’s been about ${Math.round(input.hoursSinceActivity)} hours since we saw activity from your account.`
      : "We haven’t seen activity from your account for a while.";
  const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:24px;background:#f4f4f5;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;line-height:1.55;color:#18181b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06);">
    <tr><td style="padding:28px 24px 8px;background:linear-gradient(135deg,#0d9488 0%,#0f766e 100%);color:#ecfdf5;">
      <p style="margin:0;font-size:13px;opacity:.9">${appName}</p>
      <h1 style="margin:8px 0 0;font-size:20px;font-weight:700;">تذكير — افتح التطبيق اليوم</h1>
      <p style="margin:10px 0 0;font-size:14px;opacity:.95">Friendly nudge to stay on top of your money.</p>
    </td></tr>
    <tr><td style="padding:24px;">
      <p style="margin:0 0 12px;font-size:15px;">${greeting}</p>
      <p style="margin:0 0 16px;font-size:15px;color:#3f3f46;">${hint}</p>
      <p style="margin:0 0 20px;font-size:15px;color:#3f3f46;">افتح التطبيق لدقيقة لمتابعة دخلك ومصروفاتك ورؤيتك السريعة للمرتب.</p>
      <p style="margin:0;font-size:13px;color:#71717a;">This reminder respects your notification settings (daily login reminder).</p>
    </td></tr>
  </table>
</body></html>`;
  const text = `${appName}\n\n${greeting}\n${hint}\nOpen the app to review income, expenses, and your salary overview.\n`;
  const subject = `${appName}: تذكير يومي — افتح التطبيق`;
  return { html, text, subject };
}
