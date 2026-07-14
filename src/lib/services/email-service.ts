import nodemailer from "nodemailer";

export type EmailProvider = "smtp" | "resend";

export type EmailSendResult =
  | { sent: true; provider: EmailProvider }
  | { sent: false; reason: string };

function smtpTlsRelaxed(): boolean {
  if (process.env.SMTP_TLS_INSECURE === "1") return true;
  if (process.env.SMTP_TLS_STRICT === "1") return false;
  return process.env.NODE_ENV !== "production";
}

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !port || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    requireTLS: port !== 465,
    tls: smtpTlsRelaxed() ? { rejectUnauthorized: false } : undefined,
  });
}

export function getEmailProvider(): EmailProvider | null {
  if (process.env.RESEND_API_KEY?.trim()) return "resend";
  if (getTransport()) return "smtp";
  return null;
}

export function isEmailConfigured(): boolean {
  return getEmailProvider() != null;
}

/** @deprecated use isEmailConfigured */
export function isSmtpConfigured(): boolean {
  return isEmailConfigured();
}

export function getEmailFromAddress(): string | null {
  return (
    process.env.RESEND_FROM?.trim() ||
    process.env.SMTP_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    null
  );
}

async function sendViaResend(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: {
    filename: string;
    content: Buffer;
    contentType?: string;
  }[];
}): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = getEmailFromAddress();
  if (!apiKey) return { sent: false, reason: "resend-not-configured" };
  if (!from) return { sent: false, reason: "email-from-missing" };

  const body: Record<string, unknown> = {
    from,
    to: [input.to],
    subject: input.subject,
    html: input.html,
    text: input.text,
  };

  if (input.attachments?.length) {
    body.attachments = input.attachments.map((a) => ({
      filename: a.filename,
      content: a.content.toString("base64"),
      content_type: a.contentType || "application/octet-stream",
    }));
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    return { sent: false, reason: `resend-${res.status}${errText ? `: ${errText.slice(0, 200)}` : ""}` };
  }

  return { sent: true, provider: "resend" };
}

async function sendViaSmtp(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: {
    filename: string;
    content: Buffer;
    contentType?: string;
  }[];
}): Promise<EmailSendResult> {
  const transport = getTransport();
  if (!transport) return { sent: false, reason: "smtp-not-configured" };
  const from = getEmailFromAddress();
  if (!from) return { sent: false, reason: "email-from-missing" };

  await transport.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    attachments: input.attachments,
  });
  return { sent: true, provider: "smtp" };
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: {
    filename: string;
    content: Buffer;
    contentType?: string;
  }[];
}): Promise<EmailSendResult> {
  const provider = getEmailProvider();
  if (provider === "resend") return sendViaResend(input);
  if (provider === "smtp") return sendViaSmtp(input);
  return { sent: false, reason: "email-not-configured" };
}
