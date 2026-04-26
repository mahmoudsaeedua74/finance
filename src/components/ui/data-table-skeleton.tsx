import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type ColWidth = "xs" | "sm" | "md" | "fill" | "end";

const colClass: Record<ColWidth, string> = {
  xs: "w-16 shrink-0",
  sm: "w-20 shrink-0",
  md: "w-28 shrink-0",
  fill: "min-w-0 flex-1",
  end: "w-20 shrink-0 sm:w-24",
};

/**
 * Renders a neutral table-shaped skeleton for client-side useQuery loading states.
 */
export function DataTableSkeleton({
  columnShapes,
  rows = 6,
  className,
}: {
  columnShapes: ColWidth[];
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("overflow-hidden rounded-md border", className)}
      role="status"
      aria-label="Loading data"
    >
      <span className="sr-only">Loading</span>
      <div className="flex gap-2 border-b bg-muted/30 px-3 py-2.5">
        {columnShapes.map((c, i) => (
          <Skeleton key={i} className={cn("h-3.5", colClass[c])} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div
          key={r}
          className="flex items-center gap-2 border-b border-border/30 px-3 py-2.5 last:border-0"
        >
          {columnShapes.map((c, i) => (
            <Skeleton key={i} className={cn("h-4", colClass[c])} />
          ))}
        </div>
      ))}
    </div>
  );
}
