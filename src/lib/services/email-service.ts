import nodemailer from "nodemailer";

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
  });
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const transport = getTransport();
  if (!transport) return { sent: false, reason: "smtp-not-configured" as const };
  const from = process.env.SMTP_FROM || process.env.SMTP_USER!;
  await transport.sendMail({ from, to: input.to, subject: input.subject, html: input.html, text: input.text });
  return { sent: true as const };
}

export function isSmtpConfigured(): boolean {
  return getTransport() != null;
}
