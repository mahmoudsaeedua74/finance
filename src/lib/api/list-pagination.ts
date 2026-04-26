/**
 * Standard offset-based list pagination for list GET handlers.
 * Client uses `useInfiniteQuery` with `pageParam` = `nextOffset` (or 0 for first page).
 */
export const DEFAULT_LIST_LIMIT = 30;
export const MAX_LIST_LIMIT = 100;

export function parseListPagination(sp: URLSearchParams): { limit: number; offset: number } {
  const l = sp.get("limit");
  const o = sp.get("offset");
  const limit = Math.min(
    MAX_LIST_LIMIT,
    Math.max(1, l != null && l !== "" ? parseInt(l, 10) || DEFAULT_LIST_LIMIT : DEFAULT_LIST_LIMIT)
  );
  const offset = Math.max(0, o != null && o !== "" ? parseInt(o, 10) || 0 : 0);
  return { limit, offset };
}

export type PaginatedBody<T> = {
  data: T[];
  hasMore: boolean;
  nextOffset: number | null;
};

/**
 * @param rows - either exactly `limit` items, or `limit+1` items if more exist.
 */
export function toPaginatedBody<T>(rows: T[], offset: number, limit: number): PaginatedBody<T> {
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  return {
    data,
    hasMore,
    nextOffset: hasMore ? offset + limit : null,
  };
}

/**
 * `find` + `skip` + `limit+1` then trim (common Mongoose pattern).
 */
export function toPaginatedBodyFromExtraRow<T>(rows: T[], offset: number, limit: number): PaginatedBody<T> {
  return toPaginatedBody(rows, offset, limit);
}
