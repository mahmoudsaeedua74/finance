import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { jsonFetch } from "@/lib/fetcher";

export type PaginatedResponse<T> = {
  data: T[];
  hasMore: boolean;
  nextOffset: number | null;
};

type Options = {
  queryKey: readonly unknown[];
  pageSize?: number;
  getUrl: (offset: number, limit: number) => string;
  enabled?: boolean;
};

/**
 * Offset-based infinite list (load more / infinite scroll) backed by
 * `GET` handlers that return `hasMore` + `nextOffset`.
 */
export function useInfiniteOffsetQuery<T>(opts: Options) {
  const pageSize = opts.pageSize ?? 30;
  const q = useInfiniteQuery({
    queryKey: opts.queryKey,
    enabled: opts.enabled !== false,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const offset = pageParam as number;
      return jsonFetch<PaginatedResponse<T>>(opts.getUrl(offset, pageSize));
    },
    getNextPageParam: (last) =>
      last.hasMore && last.nextOffset != null ? last.nextOffset : undefined,
  });

  const flat = useMemo(
    () => q.data?.pages.flatMap((p) => p.data) ?? [],
    [q.data?.pages]
  );

  return { ...q, flatData: flat };
}
