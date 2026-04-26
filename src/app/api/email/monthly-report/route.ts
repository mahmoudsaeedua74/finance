import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { connectDB } from "@/lib/mongodb";
import { buildMonthlyReport } from "@/lib/build-monthly-report";
import { monthlyReportPdfToBuffer } from "@/lib/monthly-report-pdf";
import { buildMonthlyReportEmailHtml } from "@/lib/email-monthly-report-html";
import type { MonthlyReportDto } from "@/types/report";

export const dynamic = "force-dynamic";

function formatReportTextShort(
  d: Awaited<ReturnType<typeof buildMonthlyReport>>,
  period: string
): string {
  const { summary, insights } = d;
  return [
    `Personal Finance — ${period}`,
    "",
    "A full PDF report is attached to this email.",
    "",
    "Quick summary:",
    `  Income:     ${summary.totalIncome.toFixed(2)}`,
    `  Expenses:   ${summary.totalExpenses.toFixed(2)}`,
    `  Net:        ${summary.netBalance.toFixed(2)}`,
    `  Project:    ${summary.projectIncome.toFixed(2)}`,
    "",
    insights.overspent
      ? "Note: expenses exceeded income this month."
      : "Spending is within or below income.",
    "",
    "Open the PDF attachment for categories, lines, and full detail.",
  ].join("\n");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const year = Number(body.year);
    const month = Number(body.month);
    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json(
        { error: "JSON body: year and month (1-12) are required" },
        { status: 400 }
      );
    }
    const to =
      (body.to as string) ||
      process.env.REPORT_EMAIL_TO ||
      process.env.SMTP_USER;
    if (!to) {
      return NextResponse.json(
        {
          error:
            "Set REPORT_EMAIL_TO or pass `to` in the body, and configure SMTP in .env",
        },
        { status: 400 }
      );
    }
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT
      ? Number(process.env.SMTP_PORT)
      : undefined;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !port || !user || !pass) {
      return NextResponse.json(
        {
          error:
            "Missing SMTP_ configuration. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env",
        },
        { status: 400 }
      );
    }

    await connectDB();
    const report = await buildMonthlyReport(year, month);
    const dto = report as unknown as MonthlyReportDto;
    const period = `${year}-${String(month).padStart(2, "0")}`;
    const pdfBuffer = monthlyReportPdfToBuffer(dto);
    const html = buildMonthlyReportEmailHtml(dto, {
      appName: process.env.EMAIL_APP_NAME || "Personal Finance",
    });
    const text = formatReportTextShort(report, period);
    // Port 465: TLS from the start. Port 587: STARTTLS. Windows AV "SSL scan" often injects a
    // self-signed cert → "self-signed certificate in certificate chain" (not a Gmail or app-password issue).
    const secure = port === 465;
    const isDev = process.env.NODE_ENV === "development";
    const wantStrict = process.env.SMTP_TLS_STRICT === "1";
    const forceInsecure = process.env.SMTP_TLS_INSECURE === "1";
    // Local dev: skip verifying SMTP cert by default (AV/proxy). Set SMTP_TLS_STRICT=1 to enforce checks.
    // Production: strict unless SMTP_TLS_INSECURE=1 (e.g. rare proxy setups).
    const skipTlsVerify = forceInsecure || (isDev && !wantStrict);
    if (isDev && skipTlsVerify) {
      console.warn(
        "[email] SMTP: TLS cert verification is relaxed in development. Set SMTP_TLS_STRICT=1 to test strict mode."
      );
    }
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      requireTLS: !secure,
      tls: {
        servername: host,
        ...(skipTlsVerify ? { rejectUnauthorized: false } : {}),
      },
    });
    const from = process.env.SMTP_FROM || user;
    const subject = `Monthly report ${period} — summary + PDF`;
    await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
      attachments: [
        {
          filename: `monthly-report-${period}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });
    return NextResponse.json({ ok: true, message: "Report sent" });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
