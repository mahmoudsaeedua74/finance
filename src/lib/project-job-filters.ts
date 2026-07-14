export type ProjectJobCollectedFilter = "all" | "collected" | "pending";

export type ProjectJobArchiveFilter = "active" | "archived" | "all";

export type ProjectJobViewMode = "list" | "kanban";

export type ProjectJobSortBy = "createdAt" | "startDate";
export type ProjectJobSortOrder = "desc" | "asc";

export type ProjectJobSort = `${ProjectJobSortBy}_${ProjectJobSortOrder}`;

export const DEFAULT_PROJECT_JOB_SORT: ProjectJobSort = "createdAt_desc";
export const PROJECT_JOBS_PAGE_SIZE = 50;
export const PROJECT_JOBS_MAX_PAGE_SIZE = 100;

export type ProjectJobWorkPhaseFilter = "all" | "quote" | "in_progress" | "delivered";

export type ProjectJobListFilters = {
  collected?: ProjectJobCollectedFilter;
  projectType?: string;
  sort?: ProjectJobSort;
  client?: string;
  workPhase?: ProjectJobWorkPhaseFilter;
  q?: string;
  archive?: ProjectJobArchiveFilter;
  view?: ProjectJobViewMode;
};

export type ProjectJobListPagination = {
  offset?: number;
  limit?: number;
};

export type ProjectJobListTotals = {
  agreed: number;
  collected: number;
  pending: number;
  spent: number;
  net: number;
};

export type ProjectJobListMeta = {
  total: number;
  totalAll: number;
  shown: number;
  loaded: number;
  offset: number;
  limit: number;
  totals: ProjectJobListTotals;
};

export function parseProjectJobSort(raw: string | null): ProjectJobSort {
  if (
    raw === "createdAt_desc" ||
    raw === "createdAt_asc" ||
    raw === "startDate_desc" ||
    raw === "startDate_asc"
  ) {
    return raw;
  }
  return DEFAULT_PROJECT_JOB_SORT;
}

export function parseProjectJobListFilters(
  searchParams: URLSearchParams
): ProjectJobListFilters {
  const collectedRaw = searchParams.get("collected");
  const collected: ProjectJobCollectedFilter =
    collectedRaw === "collected" || collectedRaw === "pending" ? collectedRaw : "all";

  const typeRaw = searchParams.get("type")?.trim();
  const projectType = typeRaw && typeRaw !== "all" ? typeRaw : "all";

  const sort = parseProjectJobSort(searchParams.get("sort"));

  const clientRaw = searchParams.get("client")?.trim();
  const client = clientRaw || undefined;

  const phaseRaw = searchParams.get("phase");
  const workPhase: ProjectJobWorkPhaseFilter =
    phaseRaw === "quote" || phaseRaw === "in_progress" || phaseRaw === "delivered"
      ? phaseRaw
      : "all";

  const qRaw = searchParams.get("q")?.trim();
  const q = qRaw || undefined;

  const archiveRaw = searchParams.get("archive");
  const archive: ProjectJobArchiveFilter =
    archiveRaw === "archived" || archiveRaw === "all" ? archiveRaw : "active";

  const viewRaw = searchParams.get("view");
  const view: ProjectJobViewMode = viewRaw === "kanban" ? "kanban" : "list";

  return { collected, projectType, sort, client, workPhase, q, archive, view };
}

export function parseProjectJobPagination(
  searchParams: URLSearchParams
): { offset: number; limit: number } {
  const offsetRaw = searchParams.get("offset");
  const limitRaw = searchParams.get("limit");
  const offset = Math.max(0, offsetRaw != null && offsetRaw !== "" ? parseInt(offsetRaw, 10) || 0 : 0);
  const limit = Math.min(
    PROJECT_JOBS_MAX_PAGE_SIZE,
    Math.max(
      1,
      limitRaw != null && limitRaw !== ""
        ? parseInt(limitRaw, 10) || PROJECT_JOBS_PAGE_SIZE
        : PROJECT_JOBS_PAGE_SIZE
    )
  );
  return { offset, limit };
}

function appendFilterParams(p: URLSearchParams, filters: ProjectJobListFilters) {
  if (filters.collected && filters.collected !== "all") {
    p.set("collected", filters.collected);
  }
  if (filters.projectType && filters.projectType !== "all") {
    p.set("type", filters.projectType);
  }
  if (filters.sort && filters.sort !== DEFAULT_PROJECT_JOB_SORT) {
    p.set("sort", filters.sort);
  }
  if (filters.client?.trim()) {
    p.set("client", filters.client.trim());
  }
  if (filters.workPhase && filters.workPhase !== "all") {
    p.set("phase", filters.workPhase);
  }
  if (filters.q?.trim()) {
    p.set("q", filters.q.trim());
  }
  if (filters.archive && filters.archive !== "active") {
    p.set("archive", filters.archive);
  }
  if (filters.view && filters.view !== "list") {
    p.set("view", filters.view);
  }
}

export function buildProjectJobsFilterQueryString(filters: ProjectJobListFilters): string {
  const p = new URLSearchParams();
  appendFilterParams(p, filters);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function buildProjectJobsQueryString(
  filters: ProjectJobListFilters,
  pagination?: ProjectJobListPagination
): string {
  const p = new URLSearchParams();
  appendFilterParams(p, filters);

  const offset = pagination?.offset ?? 0;
  const limit = pagination?.limit ?? PROJECT_JOBS_PAGE_SIZE;
  if (offset > 0) p.set("offset", String(offset));
  if (limit !== PROJECT_JOBS_PAGE_SIZE) p.set("limit", String(limit));

  const s = p.toString();
  return s ? `?${s}` : "";
}

export function hasActiveProjectJobFilters(filters: ProjectJobListFilters): boolean {
  return (
    (filters.collected != null && filters.collected !== "all") ||
    (filters.projectType != null && filters.projectType !== "all") ||
    (filters.sort != null && filters.sort !== DEFAULT_PROJECT_JOB_SORT) ||
    Boolean(filters.client?.trim()) ||
    Boolean(filters.q?.trim()) ||
    (filters.workPhase != null && filters.workPhase !== "all") ||
    (filters.archive != null && filters.archive !== "active") ||
    (filters.view != null && filters.view !== "list")
  );
}

export function clientFilterFromUrlKey(key: string): string {
  try {
    return decodeURIComponent(key);
  } catch {
    return key;
  }
}

export function clientUrlKey(name: string): string {
  return encodeURIComponent(name.trim());
}
