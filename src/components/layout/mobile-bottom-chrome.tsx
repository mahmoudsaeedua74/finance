"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  Banknote,
  FileBarChart2,
  FolderKanban,
  LayoutGrid,
  Minus,
  Plus,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const TABS: {
  href: string;
  k: "home" | "income" | "spend" | "work" | "report";
  Icon: typeof LayoutGrid;
}[] = [
  { href: "/", k: "home", Icon: LayoutGrid },
  { href: "/income", k: "income", Icon: Banknote },
  { href: "/expense", k: "spend", Icon: Receipt },
  { href: "/projects", k: "work", Icon: FolderKanban },
  { href: "/report", k: "report", Icon: FileBarChart2 },
];

const HIDE_ADD_ON = ["/income/new", "/expense/new"];

/**
 * Mobile-only: quick add row + bottom tab bar + home indicator safe area.
 * Single fixed stack avoids overlap with safe-area insets.
 */
export function MobileBottomChrome() {
  const pathname = usePathname();
  const t = useTranslations("navM");
  const tC = useTranslations("common");
  const tLayout = useTranslations("layout");
  const showAdd = !HIDE_ADD_ON.some((p) => p === pathname);
  const locale = useLocale();
  const isRtl = locale === "ar";

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex flex-col border-t border-border/80 bg-background/90 shadow-[0_-4px_24px_rgba(0,0,0,0.07)] backdrop-blur-lg supports-[backdrop-filter]:bg-background/85 dark:shadow-[0_-4px_28px_rgba(0,0,0,0.35)]"
      role="presentation"
    >
      {showAdd && (
        <div className="border-b border-border/60 bg-muted/15 px-2 py-2">
          <div
            className="mx-auto flex w-full min-w-0 max-w-2xl gap-2"
            style={{ direction: isRtl ? "rtl" : "ltr" }}
          >
            <Link
              href="/income/new"
              className={cn(
                buttonVariants({ size: "lg", variant: "default" }),
                "flex-1 min-h-12 justify-center gap-2 rounded-lg text-base font-semibold touch-manipulation"
              )}
            >
              <Plus className="size-5 shrink-0" aria-hidden />
              <span className="truncate">{tC("addIncome")}</span>
            </Link>
            <Link
              href="/expense/new"
              className={cn(
                buttonVariants({ size: "lg", variant: "secondary" }),
                "flex-1 min-h-12 justify-center gap-2 rounded-lg text-base font-semibold touch-manipulation"
              )}
            >
              <Minus className="size-5 shrink-0" aria-hidden />
              <span className="truncate">{tC("addExpense")}</span>
            </Link>
          </div>
        </div>
      )}

      <nav
        className="grid min-h-16 w-full min-w-0 grid-cols-5 gap-0 px-0"
        aria-label={tLayout("mainNav")}
      >
        {TABS.map(({ href, k, Icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex min-h-16 min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 py-1.5 text-[10px] font-medium leading-tight text-muted-foreground touch-manipulation transition-colors",
                "active:bg-muted/80 sm:text-xs",
                active && "text-foreground"
              )}
            >
              {active && (
                <span
                  className="absolute top-0 left-1/2 h-0.5 w-9 -translate-x-1/2 rounded-b-full bg-primary shadow-[0_1px_8px_rgba(0,0,0,0.12)]"
                  aria-hidden
                />
              )}
              <Icon
                className={cn(
                  "size-6 shrink-0 transition-transform",
                  active ? "scale-105 text-primary" : "opacity-80"
                )}
                aria-hidden
              />
              <span className="w-full text-center [overflow-wrap:anywhere]">{t(k)}</span>
            </Link>
          );
        })}
      </nav>
      <div
        className="min-h-[max(0.5rem,env(safe-area-inset-bottom,0px))] bg-background"
        aria-hidden
      />
    </div>
  );
}
