"use client";

import { useCallback, useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { jsonFetch } from "@/lib/fetcher";
import {
  buildProjectJobsFilterQueryString,
  buildProjectJobsQueryString,
  parseProjectJobListFilters,
  PROJECT_JOBS_PAGE_SIZE,
  type ProjectJobCollectedFilter,
  type ProjectJobArchiveFilter,
  type ProjectJobListFilters,
  type ProjectJobListMeta,
  type ProjectJobSort,
  type ProjectJobViewMode,
  type ProjectJobWorkPhaseFilter,
} from "@/lib/project-job-filters";
import type { ProjectType } from "@/lib/project-type";
import type { ProjectJobDto } from "@/types/project-job";

export type ProjectJobsListResponse = {
  data: ProjectJobDto[];
  hasMore: boolean;
  nextOffset: number | null;
  meta: ProjectJobListMeta;
};

export function useProjectJobsList() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = useMemo(
    () => parseProjectJobListFilters(searchParams),
    [searchParams]
  );

  const replaceFilters = useCallback(
    (next: ProjectJobListFilters) => {
      const qs = buildProjectJobsFilterQueryString(next);
      router.replace(qs ? `${pathname}${qs}` : pathname, { scroll: false });
    },
    [pathname, router]
  );

  const setCollected = useCallback(
    (collected: ProjectJobCollectedFilter) => {
      replaceFilters({ ...filters, collected });
    },
    [filters, replaceFilters]
  );

  const setProjectType = useCallback(
    (projectType: ProjectType | "all") => {
      replaceFilters({ ...filters, projectType });
    },
    [filters, replaceFilters]
  );

  const setSort = useCallback(
    (sort: ProjectJobSort) => {
      replaceFilters({ ...filters, sort });
    },
    [filters, replaceFilters]
  );

  const setClient = useCallback(
    (client: string) => {
      replaceFilters({ ...filters, client: client.trim() || undefined });
    },
    [filters, replaceFilters]
  );

  const setWorkPhase = useCallback(
    (workPhase: ProjectJobWorkPhaseFilter) => {
      replaceFilters({ ...filters, workPhase });
    },
    [filters, replaceFilters]
  );

  const setSearch = useCallback(
    (q: string) => {
      replaceFilters({ ...filters, q: q.trim() || undefined });
    },
    [filters, replaceFilters]
  );

  const setArchive = useCallback(
    (archive: ProjectJobArchiveFilter) => {
      replaceFilters({ ...filters, archive });
    },
    [filters, replaceFilters]
  );

  const setView = useCallback(
    (view: ProjectJobViewMode) => {
      replaceFilters({ ...filters, view });
    },
    [filters, replaceFilters]
  );

  const clearFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  const query = useInfiniteQuery({
    queryKey: ["project-jobs", filters],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const qs = buildProjectJobsQueryString(filters, {
        offset: pageParam as number,
        limit: PROJECT_JOBS_PAGE_SIZE,
      });
      return jsonFetch<ProjectJobsListResponse>(`/api/project-jobs${qs}`);
    },
    getNextPageParam: (last) =>
      last.hasMore && last.nextOffset != null ? last.nextOffset : undefined,
  });

  const jobs = useMemo(
    () => query.data?.pages.flatMap((p) => p.data) ?? [],
    [query.data?.pages]
  );

  const isListLoading =
    query.isPending ||
    (query.isFetching && !query.isFetchingNextPage && jobs.length === 0);

  const meta = query.data?.pages[0]?.meta;
  const totals = meta?.totals ?? {
    agreed: 0,
    collected: 0,
    pending: 0,
    spent: 0,
    net: 0,
  };

  return {
    filters,
    jobs,
    meta,
    totals,
    setCollected,
    setProjectType,
    setSort,
    setClient,
    setWorkPhase,
    setSearch,
    setArchive,
    setView,
    clearFilters,
    isListLoading,
    ...query,
  };
}
