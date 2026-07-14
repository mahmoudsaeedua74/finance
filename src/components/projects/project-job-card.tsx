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
        "group overflow-hidden border-border/50 bg-card/80 shadow-sm transition-all hover:border-border hover:shadow-md",
        selected && "border-primary/40 ring-2 ring-primary/20",
        job.isArchived && "opacity-80",
        compact && "text-xs"
      )}
    >
      <CardContent className={cn("space-y-2.5", compact ? "p-2.5" : "p-3")}>
        <div className="flex items-start gap-2">
          {canSelectProjectJob(job) && onToggleSelected && (
            <input
              type="checkbox"
              className="mt-1 size-4 shrink-0 accent-primary"
              checked={selected}
              onChange={() => onToggleSelected(job.id)}
              aria-label={t("bulkSelectOne")}
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-1">
              <button
                type="button"
                className="min-w-0 flex-1 text-start"
                onClick={() => onOpenDetail(job)}
              >
                <p
                  className={cn(
                    "truncate font-semibold leading-snug text-foreground",
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
                    "size-7 shrink-0 text-muted-foreground"
                  )}
                  aria-label={t("cardMenu")}
                >
                  <EllipsisVertical className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
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

        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
              phaseTone(phase)
            )}
          >
            {phaseLabel}
          </span>
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
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
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal">
              {projectTypeLabel(job.projectType ?? "normal", t)}
            </Badge>
          )}
        </div>

        {job.agreedAmount > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
              <span>{formatMoney(job.collectedAmount)}</span>
              <span className="font-mono tabular-nums">{Math.round(collectionPct)}%</span>
              <span>{formatMoney(job.agreedAmount)}</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-muted/80">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  job.status === "collected" ? "bg-emerald-500" : "bg-primary/70"
                )}
                style={{ width: `${collectionPct}%` }}
              />
            </div>
          </div>
        )}

        {!compact && (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/20 px-2 py-1.5 text-[11px]">
            <span className="text-muted-foreground">{t("pendingAmount")}</span>
            <span className="font-mono font-semibold tabular-nums text-amber-600 dark:text-amber-400">
              {formatMoney(job.pendingAmount)}
            </span>
          </div>
        )}

        <div className="flex flex-wrap gap-1 pt-0.5">
          {job.status !== "cancelled" && job.pendingAmount > 0.005 && (
            <Button
              type="button"
              size="sm"
              className={cn("h-7 gap-1 px-2.5 text-xs", compact && "h-6 px-2 text-[11px]")}
              onClick={() => onCollect(job)}
            >
              <CheckCircle2 className="size-3" />
              {t("collectBtn")}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn("h-7 gap-1 px-2.5 text-xs", compact && "h-6 px-2 text-[11px]")}
            onClick={() => onOpenDetail(job)}
          >
            <FileText className="size-3" />
            {t("detailsBtn")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={cn("h-7 gap-1 px-2.5 text-xs", compact && "h-6 px-2 text-[11px]")}
            onClick={() => onClone(job)}
          >
            <Copy className="size-3" />
            {t("cloneBtn")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
