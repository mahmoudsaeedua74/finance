"use client";

import { motion } from "framer-motion";
import {
  Moon,
  Sun,
  MoreHorizontal,
  LayoutGrid,
  Banknote,
  Receipt,
  FolderKanban,
  FileBarChart2,
  Wallet,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useTheme } from "next-themes";
import { useState, memo, type ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useMonth } from "@/context/month-context";
import { MonthSwitcher } from "@/components/shared/month-switcher";
import { MonthCompact } from "@/components/layout/month-compact";
import { DesktopMonthBar } from "@/components/layout/desktop-month-bar";
import { formatMoney } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import { jsonFetch } from "@/lib/fetcher";
import type { MonthlyReportDto } from "@/types/report";
import { MobileBottomChrome } from "@/components/layout/mobile-bottom-chrome";
import { Separator } from "@/components/ui/separator";
import { LanguageSwitcher } from "@/components/locale/LanguageSwitcher";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
console.log("hello");
const sideLinks = [
  { href: "/", k: "dashboard" as const, Icon: LayoutGrid },
  { href: "/income", k: "income" as const, Icon: Banknote },
  { href: "/expense", k: "expenses" as const, Icon: Receipt },
  { href: "/projects", k: "projects" as const, Icon: FolderKanban },
  { href: "/report", k: "report" as const, Icon: FileBarChart2 },
] as const;

function useSummaryChip() {
  const { year, month } = useMonth();
  const { data } = useQuery({
    queryKey: ["report", year, month],
    queryFn: () =>
      jsonFetch<{ data: MonthlyReportDto }>(
        `/api/reports/monthly?year=${year}&month=${month}`,
      ),
  });
  const net = data?.data.summary.netBalance;
  return net != null ? formatMoney(net) : "…";
}

function NavList({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const path = usePathname();
  const t = useTranslations("nav");
  const tLayout = useTranslations("layout");
  return (
    <nav
      className={cn("flex flex-col gap-0.5", className)}
      aria-label={tLayout("screenNav")}
    >
      {sideLinks.map((l) => {
        const active =
          l.href === "/"
            ? path === "/"
            : path === l.href || path.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            onClick={onNavigate}
            className={cn(
              "min-h-11 touch-manipulation flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium leading-snug transition-all duration-200",
              active
                ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-foreground/10"
                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
            )}
          >
            <l.Icon
              className={cn(
                "size-4 shrink-0 opacity-80",
                active && "opacity-100",
              )}
            />
            {t(l.k)}
          </Link>
        );
      })}
    </nav>
  );
}

const ThemeButton = memo(function ThemeButton({
  className,
  label,
}: {
  className?: string;
  label: string;
}) {
  const { setTheme, resolvedTheme } = useTheme();
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className={cn("size-11 shrink-0 touch-manipulation sm:size-9", className)}
      aria-label={label}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="size-5 dark:hidden" />
      <Moon className="size-5 hidden dark:inline" />
    </Button>
  );
});

function SidebarTheme({ themeLabel }: { themeLabel: string }) {
  const { setTheme, resolvedTheme } = useTheme();
  return (
    <Button
      type="button"
      variant="outline"
      className="h-12 w-full touch-manipulation justify-center gap-2 text-sm font-medium"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="size-4 dark:hidden" />
      <Moon className="size-4 hidden dark:inline" />
      {themeLabel}
    </Button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const chip = useSummaryChip();
  const pathname = usePathname();
  const tLayout = useTranslations("layout");
  const shortBottomChrome =
    pathname === "/income/new" || pathname === "/expense/new";
  const locale = useLocale();
  const isRtl = locale === "ar";
  const sheetSide = isRtl ? "left" : "right";
  const tComm = useTranslations("common");

  const mainBottomPad = shortBottomChrome
    ? "max-md:pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))]"
    : "max-md:pb-[calc(10.5rem+env(safe-area-inset-bottom,0px))]";

  return (
    <div className="app-root min-w-0 flex min-h-dvh flex-col md:flex-row">
      <aside
        className="hidden w-[15.5rem] min-w-0 flex-col border-e border-border/80 bg-gradient-to-b from-card via-card to-muted/20 shadow-[inset_-1px_0_0_0_rgba(0,0,0,0.03)] dark:shadow-[inset_-1px_0_0_0_rgba(255,255,255,0.04)] md:flex"
        aria-label={tLayout("appSidebar")}
      >
        <div className="p-4 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-border/60">
              <Wallet className="size-5" />
            </div>
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
                {tLayout("appName")}
              </p>
              <p className="text-sm font-bold leading-tight">
                {tLayout("personal")}
              </p>
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 pb-4">
          <div className="px-1">
            <LanguageSwitcher className="w-full justify-center" />
          </div>
          <NavList className="px-0.5" />
        </div>
        <div className="mt-auto space-y-2 border-t border-border/80 bg-muted/20 p-3">
          <p className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
            {tLayout("netThisMonth")}
          </p>
          <p className="font-mono text-lg font-semibold tabular-nums tracking-tight text-foreground">
            {chip}
          </p>
          <SidebarTheme themeLabel={tComm("theme")} />
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full touch-manipulation justify-center gap-2 text-sm font-medium"
            onClick={() =>
              signOut({ callbackUrl: isRtl ? "/ar/login" : "/login" })
            }
          >
            <LogOut className="size-4" />
            {tComm("signOut")}
          </Button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 w-full min-w-0 border-b border-border/80 bg-background/90 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/85 md:hidden">
          <div className="mx-auto flex h-14 w-full min-w-0 max-w-7xl items-center gap-1 px-2 sm:px-3">
            <div className="min-w-0 flex-1">
              <MonthCompact />
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <LanguageSwitcher className="h-9 px-2" />
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger
                  className={cn(
                    buttonVariants({ size: "icon", variant: "outline" }),
                    "size-11 touch-manipulation",
                  )}
                  aria-label={tLayout("openMenu")}
                  aria-haspopup="dialog"
                >
                  <MoreHorizontal className="size-5" />
                </SheetTrigger>
                <SheetContent
                  side={sheetSide}
                  className="flex w-[min(100vw,20rem)] flex-col"
                >
                  <SheetHeader>
                    <SheetTitle>{tLayout("monthOverview")}</SheetTitle>
                  </SheetHeader>
                  <div className="mt-2 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1 pb-6">
                    <div className="px-0.5">
                      <LanguageSwitcher className="w-full justify-center" />
                    </div>
                    <MonthSwitcher />
                    <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-muted/60 to-transparent p-4 ring-1 ring-inset ring-border/40">
                      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                        {tLayout("netThisMonth")}
                      </p>
                      <p className="mt-0.5 font-mono text-xl font-semibold tabular-nums">
                        {chip}
                      </p>
                    </div>
                    <Separator />
                    <p className="text-xs text-muted-foreground">
                      {tLayout("jumpTo")}
                    </p>
                    <NavList onNavigate={() => setSheetOpen(false)} />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full justify-center gap-2"
                      onClick={() => {
                        setSheetOpen(false);
                        void signOut({
                          callbackUrl: isRtl ? "/ar/login" : "/login",
                        });
                      }}
                    >
                      <LogOut className="size-4" />
                      {tComm("signOut")}
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
              <ThemeButton label={tLayout("toggleTheme")} />
            </div>
          </div>
        </header>

        <main
          className={cn(
            "app-main w-full min-w-0 max-w-full flex-1 overflow-x-hidden px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-7",
            "touch-pan-y",
            mainBottomPad,
          )}
        >
          <div className="mx-auto w-full min-w-0 max-w-6xl">
            <DesktopMonthBar />
            <motion.div
              className="min-w-0"
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>

      <MobileBottomChrome />
    </div>
  );
}
