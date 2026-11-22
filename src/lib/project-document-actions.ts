import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import {
  buildInvoiceHtml,
  buildStatementHtml,
  type DocumentAudience,
} from "@/lib/project-document-html";
import { downloadHtmlAsPdf, pdfFilename } from "@/lib/project-document-pdf";
import type { ProjectJobDto } from "@/types/project-job";
import type { FeatureDto } from "@/types/feature";
import { jsonFetch } from "@/lib/fetcher";

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

/** Build the client invoice from the current project, Features, and payment ledger. */
export async function downloadInvoicePdf(
  job: ProjectJobDto,
  locale: string,
  t: (k: string) => string
): Promise<string> {
  const [detailResponse, featureResponse] = await Promise.all([
    jsonFetch<{ data: ProjectJobDto }>(`/api/project-jobs/${job.id}`),
    jsonFetch<{ data: FeatureDto[] }>(`/api/project-jobs/${job.id}/features`),
  ]);
  const detail = detailResponse.data;
  const features = featureResponse.data ?? [];
  const lines = [
    {
      title: detail.name,
      description: detail.notes || "المشروع الأساسي حسب الاتفاق",
      amount: detail.agreedAmount,
    },
    ...features
      .filter((feature) => !feature.isArchived && feature.approvedPriceEgp != null)
      .map((feature) => ({
        title: feature.title,
        description:
          feature.description ||
          (feature.pricingMode === "free" ? "Feature مجانية" : "إضافة معتمدة ضمن المشروع"),
        amount: feature.approvedPriceEgp ?? 0,
      })),
    ...detail.payouts
      .filter((payout) => payout.lineKind === "support")
      .map((payout) => ({
        title: "دعم شهري",
        description: payout.note || "دعم إضافي للمشروع",
        amount: payout.amount,
      })),
  ];
  const featureNames = new Map(features.map((feature) => [feature.id, feature.title]));
  const payments = detail.payouts.map((payout) => ({
    description:
      payout.lineKind === "feature"
        ? featureNames.get(payout.featureId ?? "") || "Feature إضافية"
        : payout.lineKind === "support"
          ? "دعم شهري"
          : "دفعة من المشروع الأساسي",
    date: format(new Date(payout.collectedAt || payout.date), "dd / MM / yyyy"),
    amount: payout.amount,
    collected: payout.isCollected,
  }));
  const invoiceNumber = `INV-${detail.id.slice(-8).toUpperCase()}`;
  const html = buildInvoiceHtml({
    invoiceNumber,
    dateLabel: format(new Date(), "dd / MM / yyyy"),
    clientName: detail.clientName,
    projectName: detail.name,
    currency: "EGP",
    lines,
    payments,
    footerNote:
      detail.currency === "SAR"
        ? "تم عرض القيم بالجنيه المصري كقيمة محاسبية مثبتة داخل النظام."
        : t("invoiceFooterNote"),
  });
  const filename = pdfFilename(detail.name, "invoice");
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
