import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import {
  buildProposalHtml,
  buildStatementHtml,
  type DocumentAudience,
} from "@/lib/project-document-html";
import { downloadHtmlAsPdf, pdfFilename } from "@/lib/project-document-pdf";
import { isDetailedProjectType } from "@/lib/project-scope";
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

export async function downloadProposalPdf(
  job: ProjectJobDto,
  audience: DocumentAudience,
  locale: string,
  t: (k: string) => string
): Promise<string> {
  const html = buildProposalHtml({
    title: job.name,
    subtitle: isDetailedProjectType(job.projectType)
      ? t(`type.${job.projectType}`)
      : undefined,
    clientName: job.clientName,
    dateLabel: docDateLabel(locale),
    total: job.agreedAmount,
    items: job.scopeItems,
    audience,
    footerNote:
      audience === "client"
        ? t("docFooterProposalClient")
        : t("docFooterProposalInternal"),
  });
  const filename = pdfFilename(
    job.name,
    audience === "client" ? "proposal-client" : "proposal-internal"
  );
  await downloadHtmlAsPdf(html, filename);
  return filename;
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
      collected: j.collectedAmount,
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
