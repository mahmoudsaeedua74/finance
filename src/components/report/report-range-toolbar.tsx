"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Download } from "lucide-react";
import { cn } from "@/lib/utils";

type Range = "monthly" | "yearly" | "all";

export function ReportRangeToolbar({
  range,
  onExportPdf,
  onExportExcel,
  onExportEmail,
  emailDisabled,
}: {
  range: Range;
  onExportPdf: () => void;
  onExportExcel: () => void;
  onExportEmail: () => void;
  emailDisabled: boolean;
}) {
  const t = useTranslations("layout");
  const tRep = useTranslations("report");
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const setRange = (next: Range) => {
    const p = new URLSearchParams(search.toString());
    p.set("range", next);
    router.replace(`${pathname}?${p.toString()}`);
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div
          className={cn(
            "inline-flex rounded-lg border border-border/80 bg-muted/40 p-1 shadow-inner",
            "dark:bg-muted/25",
          )}
          role="tablist"
          aria-label={t("reportRange")}
        >
          {(["monthly", "yearly", "all"] as const).map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={range === r}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                range === r
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setRange(r)}
            >
              {r === "monthly"
                ? t("rangeMonthly")
                : r === "yearly"
                  ? t("rangeYearly")
                  : t("rangeAll")}
            </button>
          ))}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-10 gap-2 border-border/80 bg-background shadow-sm sm:min-w-[9rem]",
            )}
          >
            <Download className="size-4 opacity-70" />
            {tRep("exportMenu")}
            <ChevronDown className="size-4 opacity-60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[12rem]">
            <DropdownMenuItem onClick={onExportPdf}>{tRep("pdf")}</DropdownMenuItem>
            <DropdownMenuItem onClick={onExportExcel}>{tRep("excel")}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={emailDisabled} onClick={onExportEmail}>
              {tRep("emailBtn")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
