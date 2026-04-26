import { describe, expect, it } from "vitest";
import { parseListPagination, toPaginatedBody } from "./list-pagination";

describe("list-pagination", () => {
  it("clamps limit and offset", () => {
    const sp = new URLSearchParams("limit=200&offset=-1");
    expect(parseListPagination(sp)).toEqual({ limit: 100, offset: 0 });
  });
  it("splits hasMore and nextOffset", () => {
    const r = toPaginatedBody([1, 2, 3, 4], 0, 3);
    expect(r.data).toEqual([1, 2, 3]);
    expect(r.hasMore).toBe(true);
    expect(r.nextOffset).toBe(3);
  });
});
