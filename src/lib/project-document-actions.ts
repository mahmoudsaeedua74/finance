import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import {
  buildStatementHtml,
  type DocumentAudience,
} from "@/lib/project-document-html";
import { buildInvoiceHtml } from "@/lib/project-invoice-html";
import { billingDay, type ProjectBillingLine, type ProjectInvoiceMode, type ProjectInvoiceScope } from "@/lib/project-billing";
import { downloadHtmlAsPdf, pdfFilename, printHtmlDocument } from "@/lib/project-document-pdf";
import type { ProjectJobDto } from "@/types/project-job";

function docDateLabel(locale: string): string {
  const loc = locale === "ar" ? ar : enUS;
  return format(new Date(), "LLLL yyyy", { locale: loc });
}

function statusLabel(job: ProjectJobDto, t: (k: string) => string): string {
  if (job.status === "collected") return t("statusCollected");
  if (job.status === "partial") return t("statusPartial");
  if (job.status === "cancelled") return t("statusCancelled");
  return t("statusPending");
}

export async function printProjectInvoice(
  job: Pick<ProjectJobDto, "id" | "clientName" | "name" | "currency">,
  options: { scope: ProjectInvoiceScope; scopeLabel: string; mode: ProjectInvoiceMode; lines: ProjectBillingLine[]; footerNote?: string },
) {
  const { scope, mode, ...document } = options;
  const prefix = mode === "collected" ? "RCT" : "CLM";
  const suffix = scope.startsWith("feature:") ? `F-${scope.slice(-8).toUpperCase()}` : scope.toUpperCase();
  await printHtmlDocument(buildInvoiceHtml({
    ...document,
    mode,
    invoiceNumber: `${prefix}-${job.id.slice(-8).toUpperCase()}-${suffix}`,
    issuedOn: billingDay(new Date()),
    clientName: job.clientName,
    projectName: job.name,
  }));
}

export async function downloadStatementPdf(
  jobs: ProjectJobDto[],
  locale: string,
  t: (k: string) => string,
  audience: DocumentAudience = "client"
): Promise<string> {
  const clientName =
    jobs.map((j) => j.clientName.trim()).find(Boolean) ??
    t("docClientUnnamed");
  const html = buildStatementHtml({
    title: t("docStatementTitle"),
    clientName,
    dateLabel: docDateLabel(locale),
    audience,
    rows: jobs.map((j) => ({
      name: j.name,
      amount: j.agreedAmount,
      collected: j.originalCollectedAmount,
      pending: j.pendingAmount,
      statusLabel: statusLabel(j, t),
    })),
    footerNote:
      audience === "client" ? t("docFooterStatement") : t("docFooterStatementInternal"),
  });
  const suffix = audience === "client" ? "statement" : "statement-internal";
  const filename = pdfFilename(
    jobs.length === 1 ? jobs[0].name : clientName,
    suffix
  );
  await downloadHtmlAsPdf(html, filename);
  return filename;
}

export function canBulkStatement(jobs: ProjectJobDto[]): boolean {
  return jobs.length > 0;
}

/** Any active project can be selected (PDF bulk, collect when pending). */
export function canSelectProjectJob(job: ProjectJobDto): boolean {
  return job.status !== "cancelled" && !job.isArchived;
}

export function canBulkCollect(jobs: ProjectJobDto[]): boolean {
  return jobs.some((j) => j.pendingAmount > 0.005 && j.status !== "cancelled");
}
