import type { NotificationSeverity } from "@/lib/models";

export function renderMirrorNotificationEmail(input: {
  appName?: string;
  title: string;
  body: string;
  severity?: NotificationSeverity;
}) {
  const appName = input.appName || "Personal Finance";
  const label =
    input.severity === "critical" ? "Critical" : input.severity === "warning" ? "Warning" : "Notice";
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.55;color:#111">
      <h2 style="margin:0 0 8px 0;font-size:18px;font-weight:600">${appName}</h2>
      <p style="margin:0 0 6px 0;font-size:12px;text-transform:uppercase;color:#666;letter-spacing:0.04em">${label}</p>
      <p style="margin:0 0 6px 0;font-size:16px;font-weight:600">${input.title}</p>
      <p style="margin:0;font-size:14px;color:#333">${input.body}</p>
    </div>
  `;
  const text = `${appName} [${label}]\n\n${input.title}\n\n${input.body}`;
  return { html, text };
}
