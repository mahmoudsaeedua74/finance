"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { WORK_PHASES, type WorkPhase } from "@/lib/project-work-phase";
import type { ProjectJobDto } from "@/types/project-job";
import { ProjectJobCard } from "@/components/projects/project-job-card";

type Props = {
  jobs: ProjectJobDto[];
  selectedIds: Set<string>;
  onToggleSelected: (id: string) => void;
  onOpenDetail: (job: ProjectJobDto) => void;
  onCollect: (job: ProjectJobDto) => void;
  onClone: (job: ProjectJobDto) => void;
  onEdit: (job: ProjectJobDto) => void;
  onArchive: (job: ProjectJobDto) => void;
  onDelete: (job: ProjectJobDto) => void;
  onPdfClient: (job: ProjectJobDto) => void;
  onPdfInternal: (job: ProjectJobDto) => void;
};

export function ProjectJobsKanban({
  jobs,
  selectedIds,
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

  const byPhase = useMemo(() => {
    const map: Record<WorkPhase, ProjectJobDto[]> = {
      quote: [],
      in_progress: [],
      delivered: [],
    };
    for (const job of jobs) {
      const phase = job.workPhase ?? "in_progress";
      map[phase].push(job);
    }
    return map;
  }, [jobs]);

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      {WORK_PHASES.map((phase) => (
        <div key={phase} className="rounded-2xl border border-border/60 bg-muted/10 p-2">
          <div className="mb-2 flex items-center justify-between px-1">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t(`workPhase_${phase}`)}
            </h3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] tabular-nums">
              {byPhase[phase].length}
            </span>
          </div>
          <div className="space-y-2">
            {byPhase[phase].length === 0 ? (
              <p className="px-2 py-6 text-center text-[11px] text-muted-foreground">{t("kanbanEmpty")}</p>
            ) : (
              byPhase[phase].map((job) => (
                <ProjectJobCard
                  key={job.id}
                  job={job}
                  compact
                  selected={selectedIds.has(job.id)}
                  onToggleSelected={onToggleSelected}
                  onOpenDetail={onOpenDetail}
                  onCollect={onCollect}
                  onClone={onClone}
                  onEdit={onEdit}
                  onArchive={onArchive}
                  onDelete={onDelete}
                  onPdfClient={onPdfClient}
                  onPdfInternal={onPdfInternal}
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
