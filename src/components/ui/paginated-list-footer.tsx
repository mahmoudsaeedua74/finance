"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  labelLoadMore: string;
  labelLoading: string;
  labelEnd: string;
  /** If true, auto-fetch when the sentinel scrolls into view. */
  infiniteScroll?: boolean;
};

export function PaginatedListFooter({
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  labelLoadMore,
  labelLoading,
  labelEnd,
  infiniteScroll = true,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!infiniteScroll || !hasNextPage || isFetchingNextPage) return;
    const el = ref.current;
    if (!el) return;
    const o = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { rootMargin: "200px" }
    );
    o.observe(el);
    return () => o.disconnect();
  }, [infiniteScroll, hasNextPage, isFetchingNextPage, onLoadMore]);

  if (!hasNextPage && !isFetchingNextPage) {
    return <p className="pt-2 text-center text-xs text-muted-foreground">{labelEnd}</p>;
  }
  return (
    <div className="flex flex-col items-center gap-2 pt-3">
      <div ref={ref} className="h-1 w-full shrink-0" aria-hidden />
      {isFetchingNextPage ? (
        <p className="text-center text-xs text-muted-foreground">{labelLoading}</p>
      ) : (
        <Button type="button" variant="secondary" size="sm" onClick={() => onLoadMore()}>
          {labelLoadMore}
        </Button>
      )}
    </div>
  );
}
