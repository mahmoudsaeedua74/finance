"use client";

import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/ui/app-select";
import type { ProjectCurrency } from "@/lib/currency";
import { PROJECT_CURRENCIES } from "@/lib/currency";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  value: ProjectCurrency;
  onChange: (v: ProjectCurrency) => void;
  className?: string;
};

export function ProjectCurrencyField({ id, value, onChange, className }: Props) {
  const t = useTranslations("projects");

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{t("currency")}</Label>
      <AppSelect
        id={id}
        value={value}
        onValueChange={(v) => onChange(v as ProjectCurrency)}
        aria-label={t("currency")}
        options={PROJECT_CURRENCIES.map((c) => ({
          value: c,
          label: c === "SAR" ? t("currencySar") : t("currencyEgp"),
        }))}
      />
    </div>
  );
}
