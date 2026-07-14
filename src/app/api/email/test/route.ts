import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { sendEmail, isEmailConfigured } from "@/lib/services/email-service";

export const dynamic = "force-dynamic";

const appName = () => process.env.EMAIL_APP_NAME || "Personal Finance";

export async function POST() {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "email-not-configured", message: "SMTP or Resend is not configured on the server." },
      { status: 503 }
    );
  }

  const name = appName();
  const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:24px;font-family:system-ui,sans-serif;line-height:1.55;color:#18181b;">
  <div style="max-width:520px;margin:0 auto;padding:24px;border:1px solid #e4e4e7;border-radius:12px;">
    <h1 style="margin:0 0 12px;font-size:18px;">✅ ${name}</h1>
    <p style="margin:0 0 8px;">إيميل تجريبي — البريد شغال.</p>
    <p style="margin:0;color:#71717a;font-size:14px;">Test email — delivery is working.</p>
  </div>
</body></html>`;
  const text = `${name}\n\nإيميل تجريبي — البريد شغال.\nTest email — delivery is working.`;

  const result = await sendEmail({
    to: user.email,
    subject: `${name}: إيميل تجريبي / Test email`,
    html,
    text,
  });

  if (!result.sent) {
    return NextResponse.json(
      { error: result.reason, message: "Failed to send test email." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, provider: result.provider });
}
