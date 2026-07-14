"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronsUpDown, Phone, UserPlus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ClientOption } from "@/lib/services/client-service";

type ClientFieldProps = {
  id?: string;
  value: string;
  onChange: (name: string) => void;
  clients: ClientOption[];
  newClientPhone?: string;
  onNewClientPhoneChange?: (phone: string) => void;
  className?: string;
  size?: "default" | "compact";
};

export function ClientField({
  id = "client-field",
  value,
  onChange,
  clients,
  newClientPhone = "",
  onNewClientPhoneChange,
  className,
  size = "default",
}: ClientFieldProps) {
  const t = useTranslations("clients");
  const tP = useTranslations("projects");
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const trimmedValue = value.trim();
  const isNewClient = Boolean(
    trimmedValue && !clients.some((c) => c.clientName === trimmedValue)
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) => c.clientName.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [clients, query]);

  const showCreateOption =
    query.trim().length > 0 &&
    !clients.some((c) => c.clientName.toLowerCase() === query.trim().toLowerCase());

  function selectClient(name: string) {
    onChange(name);
    setQuery("");
    setOpen(false);
  }

  function handleInputChange(next: string) {
    onChange(next);
    setQuery(next);
    if (!open) setOpen(true);
  }

  return (
    <div ref={rootRef} className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{tP("clientName")}</Label>
      <div className="relative">
        <Input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          autoComplete="off"
          className={cn("h-11 pe-9", size === "compact" && "h-10")}
          placeholder={tP("clientNamePh")}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            setQuery(value);
            setOpen(true);
          }}
          onBlur={(e) => {
            if (!rootRef.current?.contains(e.relatedTarget as Node)) {
              setTimeout(() => setOpen(false), 150);
            }
          }}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={t("pickClient")}
          className="absolute inset-y-0 end-0 flex w-9 items-center justify-center text-muted-foreground"
          onClick={() => {
            setQuery(value);
            setOpen((o) => !o);
          }}
        >
          <ChevronsUpDown className="size-4" />
        </button>

        {open && (filtered.length > 0 || showCreateOption) ? (
          <div
            id={listId}
            role="listbox"
            className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-border bg-popover p-1 shadow-md"
          >
            {filtered.map((c) => (
              <button
                key={c.clientName}
                type="button"
                role="option"
                aria-selected={c.clientName === trimmedValue}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-start text-sm hover:bg-muted/60",
                  c.clientName === trimmedValue && "bg-primary/10"
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectClient(c.clientName)}
              >
                <span className="min-w-0 truncate font-medium">{c.clientName}</span>
                <span className="flex shrink-0 items-center gap-2">
                  {c.phone ? (
                    <span className="text-xs text-muted-foreground" dir="ltr">
                      {c.phone}
                    </span>
                  ) : null}
                  {c.clientName === trimmedValue ? (
                    <Check className="size-4 text-primary" aria-hidden />
                  ) : null}
                </span>
              </button>
            ))}
            {showCreateOption ? (
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg border-t border-border/60 px-3 py-2.5 text-start text-sm text-primary hover:bg-muted/60"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectClient(query.trim())}
              >
                <UserPlus className="size-4 shrink-0" />
                <span>{t("pickNewClient", { name: query.trim() })}</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {isNewClient && onNewClientPhoneChange ? (
        <div className="space-y-2 rounded-xl border border-dashed border-border/80 bg-muted/10 p-3">
          <p className="text-xs text-muted-foreground">{t("newClientHint")}</p>
          <div className="space-y-2">
            <Label htmlFor={`${id}-phone`} className="flex items-center gap-1.5 text-xs">
              <Phone className="size-3.5" />
              {t("phone")}
              <span className="text-muted-foreground">({t("optional")})</span>
            </Label>
            <Input
              id={`${id}-phone`}
              type="tel"
              inputMode="tel"
              dir="ltr"
              className="h-10"
              placeholder={t("phonePh")}
              value={newClientPhone}
              onChange={(e) => onNewClientPhoneChange(e.target.value)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
