"use client";

import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { PROJECT_TYPES, type ProjectType } from "@/lib/project-type";

type Props = {
  id?: string;
  value: ProjectType;
  onChange: (v: ProjectType) => void;
  className?: string;
  compact?: boolean;
};

export function ProjectTypeField({
  id = "project-type",
  value,
  onChange,
  className,
  compact,
}: Props) {
  const t = useTranslations("projects");

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id} className="text-sm font-medium">
        {t("projectType")}
      </Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as ProjectType)}
        className={cn(
          "h-11 w-full rounded-md border border-input bg-background px-3 text-sm",
          compact && "h-10 text-xs"
        )}
      >
        {PROJECT_TYPES.map((type) => (
          <option key={type} value={type}>
            {t(`type.${type}`)}
          </option>
        ))}
      </select>
    </div>
  );
}

export function projectTypeLabel(type: ProjectType, t: (k: string) => string) {
  return t(`type.${type}`);
}
