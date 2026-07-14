"use client";

import { ChevronDown, FileText, Loader2, Receipt } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Props = {
  count: number;
  onClear: () => void;
  onCollect: () => void;
  onStatementPdfClient: () => void;
  onStatementPdfInternal: () => void;
  isCollecting?: boolean;
  canCollect?: boolean;
  canStatement?: boolean;
  pdfBusy?: boolean;
  labels: {
    selected: string;
    clear: string;
    collectAll: string;
    pdfMenu: string;
    pdfClient: string;
    pdfInternal: string;
  };
  className?: string;
};

export function ProjectBulkActionBar({
  count,
  onClear,
  onCollect,
  onStatementPdfClient,
  onStatementPdfInternal,
  isCollecting,
  canCollect = true,
  canStatement = true,
  pdfBusy = false,
  labels,
  className,
}: Props) {
  if (count <= 0) return null;

  return (
    <div
      className={cn(
        "sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 shadow-sm backdrop-blur-sm",
        className
      )}
    >
      <p className="text-sm font-medium">{labels.selected.replace("{count}", String(count))}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onClear}>
          {labels.clear}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={!canStatement || pdfBusy}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
          >
            <Receipt className="size-3.5" />
            {labels.pdfMenu}
            <ChevronDown className="size-3.5 opacity-60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onStatementPdfClient}>{labels.pdfClient}</DropdownMenuItem>
            <DropdownMenuItem onClick={onStatementPdfInternal}>{labels.pdfInternal}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button type="button" size="sm" onClick={onCollect} disabled={isCollecting || !canCollect}>
          {isCollecting ? (
            <>
              <Loader2 className="me-1.5 size-3.5 animate-spin" />
              …
            </>
          ) : (
            <>
              <FileText className="me-1.5 size-3.5" />
              {labels.collectAll}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
