"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Copy, KeyRound, Mail } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  email?: string;
  password?: string;
  className?: string;
  /** Compact chips for list cards */
  compact?: boolean;
};

async function copyText(value: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const el = document.createElement("textarea");
  el.value = value;
  el.setAttribute("readonly", "");
  el.style.position = "fixed";
  el.style.opacity = "0";
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
}

function Chip({
  label,
  value,
  icon,
  compact,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  compact?: boolean;
}) {
  const t = useTranslations("projects");

  return (
    <button
      type="button"
      title={t("credentialCopyHint")}
      aria-label={`${label}: ${value}. ${t("credentialCopyHint")}`}
      className={cn(
        "group inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border/60 bg-muted/30 text-start transition",
        "hover:border-primary/40 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        "active:scale-[0.98]",
        compact ? "px-2 py-1 text-[10px]" : "px-2.5 py-1.5 text-xs"
      )}
      onClick={(e) => {
        e.stopPropagation();
        void copyText(value)
          .then(() => toast.success(t("credentialCopied", { label })))
          .catch(() => toast.error(t("credentialCopyFail")));
      }}
    >
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span className="min-w-0 truncate font-mono tabular-nums text-foreground">{value}</span>
      <Copy
        className={cn(
          "shrink-0 text-muted-foreground opacity-60 transition group-hover:opacity-100",
          compact ? "size-3" : "size-3.5"
        )}
        aria-hidden
      />
    </button>
  );
}

export function ProjectCredentialChips({ email, password, className, compact }: Props) {
  const t = useTranslations("projects");
  const mail = email?.trim() ?? "";
  const pass = password?.trim() ?? "";
  if (!mail && !pass) return null;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {mail ? (
        <Chip
          label={t("projectEmail")}
          value={mail}
          compact={compact}
          icon={<Mail className={compact ? "size-3" : "size-3.5"} aria-hidden />}
        />
      ) : null}
      {pass ? (
        <Chip
          label={t("projectPassword")}
          value={pass}
          compact={compact}
          icon={<KeyRound className={compact ? "size-3" : "size-3.5"} aria-hidden />}
        />
      ) : null}
    </div>
  );
}
