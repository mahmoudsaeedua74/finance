"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Filter, LayoutGrid, Columns3, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterNativeSelect } from "@/components/ui/filter-native-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PROJECT_TYPES,
  isPresetProjectType,
  type ProjectType,
} from "@/lib/project-type";
import { projectTypeLabel } from "@/components/forms/project-type-field";
import { WORK_PHASES } from "@/lib/project-work-phase";
import {
  DEFAULT_PROJECT_JOB_COLLECTED,
  DEFAULT_PROJECT_JOB_SORT,
  hasActiveProjectJobFilters,
  type ProjectJobArchiveFilter,
  type ProjectJobCollectedFilter,
  type ProjectJobListFilters,
  type ProjectJobSort,
  type ProjectJobViewMode,
  type ProjectJobWorkPhaseFilter,
} from "@/lib/project-job-filters";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 300;

type Props = {
  filters: ProjectJobListFilters;
  clientNames?: string[];
  /** Custom project types found on jobs (shown in type filter). */
  extraProjectTypes?: string[];
  onCollectedChange: (v: ProjectJobCollectedFilter) => void;
  onTypeChange: (v: ProjectType | "all") => void;
  onSortChange: (v: ProjectJobSort) => void;
  onClientChange: (v: string) => void;
  onWorkPhaseChange: (v: ProjectJobWorkPhaseFilter) => void;
  onSearchChange: (v: string) => void;
  onArchiveChange: (v: ProjectJobArchiveFilter) => void;
  onViewChange: (v: ProjectJobViewMode) => void;
  onClearFilters: () => void;
  shown: number;
  total: number;
  loading?: boolean;
};

const SORT_OPTIONS: ProjectJobSort[] = [
  "createdAt_desc",
  "createdAt_asc",
  "startDate_desc",
  "startDate_asc",
];

export function ProjectJobsFilterBar({
  filters,
  clientNames = [],
  extraProjectTypes = [],
  onCollectedChange,
  onTypeChange,
  onSortChange,
  onClientChange,
  onWorkPhaseChange,
  onSearchChange,
  onArchiveChange,
  onViewChange,
  onClearFilters,
  shown,
  total,
  loading = false,
}: Props) {
  const t = useTranslations("projects");

  const collected = filters.collected ?? DEFAULT_PROJECT_JOB_COLLECTED;
  const projectType = (filters.projectType ?? "all") as ProjectType | "all";
  const sort = filters.sort ?? DEFAULT_PROJECT_JOB_SORT;
  const client = filters.client ?? "";
  const workPhase = filters.workPhase ?? "all";
  const q = filters.q ?? "";
  const archive = filters.archive ?? "active";
  const view = filters.view ?? "list";

  const [searchDraft, setSearchDraft] = useState(q);

  useEffect(() => {
    setSearchDraft(q);
  }, [q]);

  useEffect(() => {
    if (searchDraft === q) return;
    const id = window.setTimeout(() => onSearchChange(searchDraft), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchDraft, q, onSearchChange]);

  const hasActive = hasActiveProjectJobFilters(filters);

  const typeOptions = useMemo(() => {
    const extras = Array.from(
      new Set(
        extraProjectTypes
          .map((x) => x.trim())
          .filter((x) => x && !isPresetProjectType(x)),
      ),
    ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    return [
      { value: "all", label: t("filterTypeAll") },
      ...PROJECT_TYPES.map((type) => ({
        value: type,
        label: projectTypeLabel(type, t),
      })),
      ...extras.map((type) => ({
        value: type,
        label: projectTypeLabel(type, t),
      })),
    ];
  }, [t, extraProjectTypes]);

  const clientOptions = useMemo(() => {
    const names = Array.from(
      new Set(
        [...clientNames, client]
          .map((n) => n.trim())
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    return [
      { value: "", label: t("filterClientAll") },
      ...names.map((name) => ({ value: name, label: name })),
    ];
  }, [t, clientNames, client]);

  const sortOptions = useMemo(
    () =>
      SORT_OPTIONS.map((key) => ({
        value: key,
        label: t(`sort_${key}`),
      })),
    [t]
  );

  const phaseOptions = useMemo(
    () => [
      { value: "all", label: t("filterPhaseAll") },
      ...WORK_PHASES.map((phase) => ({
        value: phase,
        label: t(`workPhase_${phase}`),
      })),
    ],
    [t]
  );

  const archiveOptions = useMemo(
    () =>
      (["active", "archived", "all"] as const).map((key) => ({
        value: key,
        label: t(`filterArchive_${key}`),
      })),
    [t]
  );

  const collectedOptions = useMemo(
    () =>
      (["pending", "all"] as const).map((key) => ({
        value: key,
        label: t(`filterCollected_${key}`),
      })),
    [t]
  );

  return (
    <div className="relative z-10 rounded-2xl border border-border/60 bg-card p-3 shadow-sm sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Filter className="size-4" aria-hidden />
          </span>
          <p className="min-w-0 truncate" aria-live="polite">
            {loading ? (
              <Skeleton className="inline-block h-4 w-36 align-middle" />
            ) : (
              t("filtersResult", { shown, total })
            )}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant={view === "list" ? "secondary" : "ghost"}
            className="size-9 p-0"
            onClick={() => onViewChange("list")}
            aria-label={t("viewList")}
            aria-pressed={view === "list"}
          >
            <LayoutGrid className="size-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === "kanban" ? "secondary" : "ghost"}
            className="size-9 p-0"
            onClick={() => onViewChange("kanban")}
            aria-label={t("viewKanban")}
            aria-pressed={view === "kanban"}
          >
            <Columns3 className="size-4" />
          </Button>
          {hasActive ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-9 gap-1.5 rounded-lg px-2.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={onClearFilters}
            >
              <X className="size-3.5" />
              {t("clearFilters")}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="space-y-1.5 xl:col-span-2">
          <Label htmlFor="project-filter-search" className="text-xs text-muted-foreground">
            {t("filterSearch")}
          </Label>
          <Input
            id="project-filter-search"
            value={searchDraft}
            placeholder={t("filterSearchPh")}
            className="h-10"
            onChange={(e) => setSearchDraft(e.target.value)}
          />
        </div>

        <FilterNativeSelect
          id="project-filter-client"
          label={t("filterClient")}
          value={client}
          options={clientOptions}
          onChange={onClientChange}
          active={Boolean(client)}
        />

        <FilterNativeSelect
          id="project-filter-collected"
          label={t("filterCollected")}
          value={collected}
          options={collectedOptions}
          onChange={(v) => onCollectedChange(v as ProjectJobCollectedFilter)}
          active={collected !== DEFAULT_PROJECT_JOB_COLLECTED}
        />

        <FilterNativeSelect
          id="project-filter-archive"
          label={t("filterArchive")}
          value={archive}
          options={archiveOptions}
          onChange={(v) => onArchiveChange(v as ProjectJobArchiveFilter)}
          active={archive !== "active"}
        />

        <FilterNativeSelect
          id="project-filter-phase"
          label={t("filterWorkPhase")}
          value={workPhase}
          options={phaseOptions}
          onChange={(v) => onWorkPhaseChange(v as ProjectJobWorkPhaseFilter)}
          active={workPhase !== "all"}
        />

        <FilterNativeSelect
          id="project-filter-type"
          label={t("filterType")}
          value={projectType}
          options={typeOptions}
          onChange={(v) => onTypeChange(v as ProjectType | "all")}
          active={projectType !== "all"}
          className={cn("sm:col-span-2 lg:col-span-1")}
        />

        <FilterNativeSelect
          id="project-filter-sort"
          label={t("filterSort")}
          value={sort}
          options={sortOptions}
          onChange={(v) => onSortChange(v as ProjectJobSort)}
          active={sort !== DEFAULT_PROJECT_JOB_SORT}
          className="sm:col-span-2 lg:col-span-1"
        />
      </div>
    </div>
  );
}
