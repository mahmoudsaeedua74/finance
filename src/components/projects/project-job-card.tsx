"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  Archive,
  ArchiveRestore,
  CheckCircle2,
  Copy,
  EllipsisVertical,
  FileText,
  Pencil,
  Trash2,
} from "lucide-react";
import { projectTypeLabel } from "@/components/forms/project-type-field";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateLong, formatMoney } from "@/lib/format";
import { canSelectProjectJob } from "@/lib/project-document-actions";
import { canDeleteProjectJob } from "@/lib/project-job-rules";
import type { ProjectJobDto } from "@/types/project-job";
import { cn } from "@/lib/utils";
import type { WorkPhase } from "@/lib/project-work-phase";

type Props = {
  job: ProjectJobDto;
  compact?: boolean;
  selected?: boolean;
  onToggleSelected?: (id: string) => void;
  onOpenDetail: (job: ProjectJobDto) => void;
  onCollect: (job: ProjectJobDto) => void;
  onClone: (job: ProjectJobDto) => void;
  onEdit: (job: ProjectJobDto) => void;
  onArchive: (job: ProjectJobDto) => void;
  onDelete: (job: ProjectJobDto) => void;
  onPdfClient: (job: ProjectJobDto) => void;
  onPdfInternal: (job: ProjectJobDto) => void;
};

function phaseTone(phase: WorkPhase) {
  if (phase === "delivered") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  if (phase === "quote") return "bg-violet-500/10 text-violet-700 dark:text-violet-400";
  return "bg-sky-500/10 text-sky-700 dark:text-sky-400";
}

function payTone(status: ProjectJobDto["status"]) {
  if (status === "collected") return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300";
  if (status === "partial") return "bg-amber-500/15 text-amber-800 dark:text-amber-300";
  if (status === "cancelled") return "bg-destructive/10 text-destructive";
  return "bg-muted text-muted-foreground";
}

export function ProjectJobCard({
  job,
  compact = false,
  selected = false,
  onToggleSelected,
  onOpenDetail,
  onCollect,
  onClone,
  onEdit,
  onArchive,
  onDelete,
  onPdfClient,
  onPdfInternal,
}: Props) {
  const t = useTranslations("projects");
  const locale = useLocale();

  const phase = job.workPhase ?? "in_progress";
  const collectionPct =
    job.agreedAmount > 0 ? Math.min(100, (job.collectedAmount / job.agreedAmount) * 100) : 0;
  const deletable = canDeleteProjectJob(job);
  const canCollect = job.status !== "cancelled" && job.pendingAmount > 0.005;

  const phaseLabel =
    phase === "delivered"
      ? t("workPhase_delivered")
      : phase === "quote"
        ? t("workPhase_quote")
        : t("workPhase_in_progress");

  const payLabel =
    job.status === "collected"
      ? t("statusCollected")
      : job.status === "partial"
        ? t("statusPartial")
        : job.status === "cancelled"
          ? t("statusCancelled")
          : t("statusPending");

  return (
    <Card
      className={cn(
        "group overflow-hidden border-border/50 bg-card/80 shadow-sm transition-[border-color,box-shadow,transform] duration-200",
        "hover:border-border hover:shadow-md",
        "motion-safe:active:scale-[0.99]",
        selected && "border-primary/40 ring-2 ring-primary/20",
        job.isArchived && "opacity-80",
        compact && "text-xs"
      )}
    >
      <CardContent className={cn("space-y-2", compact ? "p-2.5" : "p-3")}>
        <div className="flex items-start gap-2">
          {canSelectProjectJob(job) && onToggleSelected && (
            <label className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md hover:bg-muted/60">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={selected}
                onChange={() => onToggleSelected(job.id)}
                aria-label={t("bulkSelectOne")}
              />
            </label>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-1">
              <button
                type="button"
                className="min-w-0 flex-1 cursor-pointer rounded-md text-start outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40"
                onClick={() => onOpenDetail(job)}
              >
                <p
                  className={cn(
                    "line-clamp-2 font-semibold leading-snug text-foreground",
                    compact ? "text-xs" : "text-sm"
                  )}
                >
                  {job.name}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {job.clientName ? `${job.clientName} · ` : ""}
                  {formatDateLong(new Date(job.startDate), locale)}
                </p>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "icon" }),
                    "size-9 shrink-0 text-muted-foreground"
                  )}
                  aria-label={t("cardMenu")}
                >
                  <EllipsisVertical className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={() => onPdfClient(job)}>
                    <FileText className="size-3.5" />
                    {t("pdfForClient")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onPdfInternal(job)}>
                    <FileText className="size-3.5" />
                    {t("pdfWithDetails")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onEdit(job)}>
                    <Pencil className="size-3.5" />
                    {t("editJob")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onArchive(job)}>
                    {job.isArchived ? (
                      <>
                        <ArchiveRestore className="size-3.5" />
                        {t("unarchiveBtn")}
                      </>
                    ) : (
                      <>
                        <Archive className="size-3.5" />
                        {t("archiveBtn")}
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={!deletable}
                    onClick={() => deletable && onDelete(job)}
                  >
                    <Trash2 className="size-3.5" />
                    {t("deleteJob")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <span
            className={cn(
              "inline-flex max-w-full truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
              phaseTone(phase)
            )}
          >
            {phaseLabel}
          </span>
          <span
            className={cn(
              "inline-flex max-w-full truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
              payTone(job.status)
            )}
          >
            {payLabel}
          </span>
          {job.isArchived && (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
              {t("archivedBadge")}
            </Badge>
          )}
          {!compact && (
            <Badge
              variant="outline"
              className="hidden h-5 px-1.5 text-[10px] font-normal sm:inline-flex"
            >
              {projectTypeLabel(job.projectType ?? "normal", t)}
            </Badge>
          )}
        </div>

        {job.agreedAmount > 0 ? (
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[10px] text-muted-foreground">{t("pendingAmount")}</span>
              <span className="font-mono text-sm font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                {formatMoney(job.pendingAmount)}
              </span>
            </div>
            {job.currency === "SAR" && (
              <p className="text-[10px] text-muted-foreground">
                <span className="font-mono tabular-nums">{formatMoney(job.originalAmount, "SAR")}</span>
                <span className="ms-1">
                  {t("amountInEgp", { amount: formatMoney(job.agreedAmount) })}
                </span>
              </p>
            )}
            <div
              className="h-1.5 overflow-hidden rounded-full bg-muted/80"
              role="progressbar"
              aria-valuenow={Math.round(collectionPct)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t("collectionProgress")}
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-300",
                  job.status === "collected" ? "bg-emerald-500" : "bg-primary/70"
                )}
                style={{ width: `${collectionPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
              <span className="font-mono tabular-nums">{formatMoney(job.collectedAmount)}</span>
              <span className="font-mono tabular-nums">{Math.round(collectionPct)}%</span>
              <span className="font-mono tabular-nums">{formatMoney(job.agreedAmount)}</span>
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 px-2 py-1.5 text-[11px] text-amber-800 dark:text-amber-300">
            {t("amountTbd")}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {canCollect && (
            <Button
              type="button"
              size="sm"
              className={cn("min-h-9 flex-1 gap-1 px-2.5 text-xs sm:flex-none", compact && "min-h-8")}
              onClick={() => onCollect(job)}
            >
              <CheckCircle2 className="size-3.5 shrink-0" />
              {t("collectBtn")}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn("min-h-9 gap-1 px-2.5 text-xs", compact && "min-h-8", !canCollect && "flex-1 sm:flex-none")}
            onClick={() => onOpenDetail(job)}
          >
            <FileText className="size-3.5 shrink-0" />
            <span className="truncate">{t("detailsBtn")}</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={cn("min-h-9 gap-1 px-2 text-xs", compact && "min-h-8")}
            onClick={() => onClone(job)}
            aria-label={t("cloneBtn")}
          >
            <Copy className="size-3.5 shrink-0" />
            <span className="hidden sm:inline">{t("cloneBtn")}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
