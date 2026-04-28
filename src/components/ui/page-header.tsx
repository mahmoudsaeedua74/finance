import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  meta?: ReactNode;
  icon?: ReactNode;
  className?: string;
  action?: ReactNode;
};

/**
 * Consistent top-of-page title block for route screens.
 */
export function PageHeader({
  title,
  description,
  meta,
  icon,
  className,
  action,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 min-[500px]:flex-row min-[500px]:items-end min-[500px]:justify-between",
        className
      )}
    >
      <div className="min-w-0 flex gap-3">
        {icon && (
          <div
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-border/60"
            aria-hidden
          >
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-xl font-semibold tracking-tight min-[400px]:text-2xl">
            {title}
          </h1>
          {description != null && (
            <div className="mt-0.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </div>
          )}
          {meta != null && (
            <div className="mt-1 text-xs font-medium text-muted-foreground/90">
              {meta}
            </div>
          )}
        </div>
      </div>
      {action && <div className="shrink-0 min-[500px]:pl-2">{action}</div>}
    </div>
  );
}
