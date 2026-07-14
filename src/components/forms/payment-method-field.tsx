"use client";

import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/lib/payment-method";
import { Banknote, CreditCard, HelpCircle } from "lucide-react";

type Props = {
  id?: string;
  value: PaymentMethod;
  onChange: (v: PaymentMethod) => void;
  className?: string;
  optional?: boolean;
  /** compact = smaller chips for dialogs */
  size?: "default" | "compact";
};

const OPTIONS: {
  value: PaymentMethod;
  icon: typeof Banknote;
  labelKey: "methodCash" | "methodCard" | "methodUnspecified";
}[] = [
  { value: "cash", icon: Banknote, labelKey: "methodCash" },
  { value: "card", icon: CreditCard, labelKey: "methodCard" },
  { value: "unspecified", icon: HelpCircle, labelKey: "methodUnspecified" },
];

export function PaymentMethodField({
  id = "payment-method",
  value,
  onChange,
  className,
  optional = true,
  size = "default",
}: Props) {
  const t = useTranslations("wallet");

  const choices = optional
    ? OPTIONS
    : OPTIONS.filter((o) => o.value !== "unspecified");

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id} className="text-sm font-medium">
        {t("methodLabel")}
        {optional ? (
          <span className="ms-1 text-xs font-normal text-muted-foreground">({t("optional")})</span>
        ) : null}
      </Label>
      <div
        id={id}
        role="radiogroup"
        aria-label={t("methodLabel")}
        className={cn(
          "grid gap-2",
          choices.length === 2 ? "grid-cols-2" : "grid-cols-1 min-[360px]:grid-cols-3"
        )}
      >
        {choices.map((opt) => {
          const selected = value === opt.value;
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(opt.value)}
              className={cn(
                "flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
                size === "compact" && "min-h-10 py-2 text-xs",
                selected
                  ? opt.value === "cash"
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-800 ring-2 ring-emerald-500/30 dark:text-emerald-200"
                    : opt.value === "card"
                      ? "border-sky-500/50 bg-sky-500/10 text-sky-800 ring-2 ring-sky-500/30 dark:text-sky-200"
                      : "border-primary/50 bg-primary/10 text-foreground ring-2 ring-primary/30"
                  : "border-border/70 bg-muted/15 text-muted-foreground hover:border-border hover:bg-muted/30 hover:text-foreground"
              )}
            >
              <Icon className={cn("shrink-0", size === "compact" ? "size-4" : "size-4")} aria-hidden />
              <span className="truncate">{t(opt.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
