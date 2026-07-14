"use client";

import { motion } from "framer-motion";
import {
  Moon,
  Sun,
  PanelLeft,
  PanelRight,
  LayoutGrid,
  FolderKanban,
  FileBarChart2,
  Settings,
  Wallet,
  Bell,
  Gem,
  ReceiptText,
  Users,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useTheme } from "next-themes";
import { useState, type ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { DesktopMonthBar } from "@/components/layout/desktop-month-bar";
import { useLedgerNetDisplay } from "@/hooks/use-ledger-net-balance";
import { MobileBottomChrome } from "@/components/layout/mobile-bottom-chrome";
import { LanguageSwitcher } from "@/components/locale/LanguageSwitcher";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { NotificationInboxPanel, NotificationBellButton } from "@/components/notifications/notification-inbox-panel";
import { NotificationAudioWatcher } from "@/components/notifications/notification-audio-watcher";
import { useNotificationSummary } from "@/hooks/use-notification-summary";
import { WalletAccountPanel } from "@/components/wallet/wallet-account-panel";

const sideLinks = [
  { href: "/", k: "dashboard" as const, Icon: LayoutGrid },
  { href: "/transactions", k: "transactions" as const, Icon: ReceiptText },
  { href: "/projects", k: "projects" as const, Icon: FolderKanban },
  { href: "/clients", k: "clients" as const, Icon: Users },
  { href: "/gold", k: "gold" as const, Icon: Gem },
  { href: "/report", k: "report" as const, Icon: FileBarChart2 },
  { href: "/settings", k: "settings" as const, Icon: Settings },
] as const;

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
  const [inboxOpen, setInboxOpen] = useState(false);
  const { data: notifSum } = useNotificationSummary();
  const unreadN = notifSum?.data?.unreadCount ?? 0;
  const chip = useLedgerNetDisplay();
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
  const isWideShell =
    pathname === "/projects" || pathname.startsWith("/projects/");

  return (
    <div
      className={cn(
        "app-root flex min-w-0 min-h-dvh flex-col overflow-x-hidden",
        "md:min-h-0 md:h-svh md:overflow-hidden md:flex-row"
      )}
    >
      <NotificationAudioWatcher />
      <Sheet open={inboxOpen} onOpenChange={setInboxOpen}>
        <SheetContent
          side={isRtl ? "left" : "right"}
          className="flex w-[min(100vw,26rem)] flex-col gap-0 p-0 sm:max-w-md"
        >
          <SheetHeader className="shrink-0 space-y-1 border-b border-border/70 px-4 py-3 text-start">
            <SheetTitle className="text-start">{tLayout("notif.inboxTitle")}</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-hidden px-4 py-3">
            <NotificationInboxPanel />
          </div>
        </SheetContent>
      </Sheet>
      <aside
        className={cn(
          "hidden w-[15.5rem] min-w-0 shrink-0 flex-col border-e border-border/80",
          "bg-gradient-to-b from-card via-card to-muted/20",
          "shadow-[inset_-1px_0_0_0_rgba(0,0,0,0.03)] dark:shadow-[inset_-1px_0_0_0_rgba(255,255,255,0.04)]",
          "md:flex md:h-svh md:min-h-0"
        )}
        aria-label={tLayout("appSidebar")}
      >
        <div className="shrink-0 p-4 pb-3">
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
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden overscroll-y-contain px-3 pb-3">
          <div className="px-1">
            <LanguageSwitcher className="w-full justify-center" />
          </div>
          <NavList className="px-0.5" />
          <div className="px-0.5">
            <WalletAccountPanel variant="compact" />
          </div>
          <div className="space-y-2 border-t border-border/50 pt-3">
            <p className="px-1 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
              {tLayout("notif.inbox")}
            </p>
            <NotificationBellButton
              unread={unreadN}
              onOpen={() => setInboxOpen(true)}
              className="w-full justify-start"
            />
          </div>
        </div>
        <div className="shrink-0 space-y-2 border-t border-border/80 bg-muted/20 p-3">
          <p className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
            {tLayout("netAllTime")}
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

      <div className="flex min-h-0 min-w-0 flex-1 flex-col md:min-h-0 md:overflow-hidden">
        <header className="sticky top-0 z-30 w-full min-w-0 shrink-0 border-b border-border/80 bg-background/90 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/85 md:hidden">
          <div className="mx-auto flex min-h-14 w-full min-w-0 max-w-7xl items-center gap-2 py-1.5 ps-2 pe-2 sm:ps-3 sm:pe-3">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger
                className={cn(
                  buttonVariants({ size: "icon", variant: "outline" }),
                  "size-11 shrink-0 touch-manipulation rounded-xl border-border/80",
                )}
                aria-label={tLayout("openMenu")}
                aria-haspopup="dialog"
                aria-expanded={sheetOpen}
              >
                {isRtl ? (
                  <PanelLeft className="size-5" aria-hidden />
                ) : (
                  <PanelRight className="size-5" aria-hidden />
                )}
              </SheetTrigger>
              <SheetContent
                side={sheetSide}
                className="flex w-[min(100vw,20rem)] flex-col"
              >
                <SheetHeader>
                  <SheetTitle>{tLayout("sideMenu")}</SheetTitle>
                </SheetHeader>
                <div className="mt-2 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1 pb-6">
                  <div className="px-0.5">
                    <LanguageSwitcher className="w-full justify-center" />
                  </div>
                  <SidebarTheme themeLabel={tComm("theme")} />
                  <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-muted/50 to-transparent p-3 ring-1 ring-inset ring-border/40">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                      {tLayout("netAllTime")}
                    </p>
                    <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums">
                      {chip}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {tLayout("jumpTo")}
                  </p>
                  <NavList onNavigate={() => setSheetOpen(false)} />
                  <div className="border-t border-border/50 pt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-12 w-full justify-start gap-2.5 font-medium"
                      onClick={() => {
                        setSheetOpen(false);
                        setInboxOpen(true);
                      }}
                    >
                      <span className="relative inline-flex">
                        <Bell className="size-5" aria-hidden />
                        {unreadN > 0 ? (
                          <span
                            className="absolute -end-1.5 -top-1 min-w-[1.1rem] rounded-full bg-destructive px-1 text-center text-[0.6rem] font-bold leading-4 text-destructive-foreground"
                            aria-label={tLayout("notif.unreadCount", { n: unreadN })}
                          >
                            {unreadN > 99 ? "99+" : unreadN}
                          </span>
                        ) : null}
                      </span>
                      {tLayout("notif.inbox")}
                    </Button>
                  </div>
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
            <div
              className={cn(
                "flex min-w-0 flex-1 items-center justify-end gap-1.5 border-s border-border/50 ps-2",
                isRtl ? "flex-row-reverse" : "flex-row"
              )}
            >
              <NotificationBellButton
                compact
                unread={unreadN}
                onOpen={() => setInboxOpen(true)}
                className="size-11 shrink-0 touch-manipulation rounded-xl border-border/80"
              />
              <div
                className={cn(
                  "flex min-w-0 flex-1 flex-col justify-center gap-0.5",
                  isRtl ? "items-start text-start" : "items-end text-end"
                )}
              >
                <p className="line-clamp-1 text-[0.6rem] font-bold uppercase leading-none tracking-wider text-muted-foreground">
                  {tLayout("netAllTime")}
                </p>
                <p
                  className="max-w-full truncate font-mono text-lg font-bold leading-none tabular-nums text-foreground sm:text-xl"
                  dir="ltr"
                  title={chip}
                >
                  {chip}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main
          className={cn(
            "app-main w-full min-w-0 max-w-full flex-1 overflow-x-hidden px-3 py-3 sm:px-4 sm:py-4 md:min-h-0 md:flex-1 md:overflow-y-auto md:px-6 md:py-7",
            "touch-pan-y overscroll-y-contain",
            mainBottomPad,
          )}
        >
          <div
            className={cn(
              "mx-auto w-full min-w-0",
              isWideShell ? "store-shell !px-0" : "max-w-7xl"
            )}
          >
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
