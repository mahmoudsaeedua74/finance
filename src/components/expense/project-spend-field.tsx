"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { jsonFetch } from "@/lib/fetcher";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  disabled?: boolean;
};

export function ProjectSpendField({ id, value, onChange, className, disabled }: Props) {
  const t = useTranslations("expense");
  const { data } = useQuery({
    queryKey: ["projects", "all-for-spend"],
    queryFn: () => jsonFetch<{ data: { name: string }[] }>("/api/projects"),
  });
  const names = useMemo(() => {
    const rows = data?.data ?? [];
    const u = new Set<string>();
    for (const r of rows) {
      const n = r.name?.trim();
      if (n) u.add(n);
    }
    return Array.from(u).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [data?.data]);
  const dlId = `${id}-suggestions`;
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {t("projectTag")}
      </Label>
      <Input
        id={id}
        className="h-11"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        list={dlId}
        autoComplete="off"
        disabled={disabled}
        placeholder={t("projectTagPh")}
        aria-describedby={`${id}-hint`}
      />
      <datalist id={dlId}>
        {names.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <p id={`${id}-hint`} className="text-[0.7rem] leading-snug text-muted-foreground sm:text-xs">
        {t("projectTagHelp")}
      </p>
    </div>
  );
}
