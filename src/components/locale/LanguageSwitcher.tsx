"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";

const other = (loc: string) => (loc === "en" ? "ar" : "en");

export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const next = other(locale);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("touch-manipulation gap-1.5 font-medium", className)}
      onClick={() => router.replace(pathname, { locale: next })}
      title={t("languageSwitch", { to: t(`lang.${next}`) })}
    >
      <Languages className="size-3.5 shrink-0" aria-hidden />
      <span className="text-xs sm:text-sm">{t(`langShort.${next}`)}</span>
    </Button>
  );
}
