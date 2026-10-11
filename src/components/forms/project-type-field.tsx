"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppSelect } from "@/components/ui/app-select";
import { cn } from "@/lib/utils";
import {
  PROJECT_TYPES,
  isPresetProjectType,
  type ProjectType,
} from "@/lib/project-type";

type Props = {
  id?: string;
  value: ProjectType;
  onChange: (v: ProjectType) => void;
  className?: string;
  compact?: boolean;
  /** Extra custom types already used (e.g. from existing jobs). */
  extraTypes?: string[];
};

export function projectTypeLabel(type: ProjectType, t: (k: string) => string) {
  if (isPresetProjectType(type)) return t(`type.${type}`);
  return type;
}

export function ProjectTypeField({
  id = "project-type",
  value,
  onChange,
  className,
  compact,
  extraTypes = [],
}: Props) {
  const t = useTranslations("projects");
  const tC = useTranslations("common");
  const [addOpen, setAddOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [localExtras, setLocalExtras] = useState<string[]>([]);

  const allExtras = useMemo(() => {
    const set = new Set<string>();
    for (const x of [...extraTypes, ...localExtras]) {
      const s = x.trim();
      if (s && !isPresetProjectType(s)) set.add(s);
    }
    if (value && !isPresetProjectType(value)) set.add(value);
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [extraTypes, localExtras, value]);

  const options = useMemo(
    () => [
      ...PROJECT_TYPES.map((type) => ({
        value: type,
        label: t(`type.${type}`),
      })),
      ...allExtras.map((type) => ({ value: type, label: type })),
    ],
    [t, allExtras],
  );

  const addLabel = t("typeAdd");

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id} className="text-sm font-medium">
        {t("projectType")}
      </Label>
      <div className="flex items-center gap-2">
        <AppSelect
          id={id}
          className="min-w-0 flex-1"
          value={value}
          onValueChange={(v) => onChange(v as ProjectType)}
          aria-label={t("projectType")}
          size={compact ? "sm" : "default"}
          triggerClassName={compact ? "h-10 min-h-10 text-xs" : undefined}
          options={options}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9 shrink-0 rounded-lg border-border/80"
          onClick={() => setAddOpen(true)}
          aria-label={addLabel}
          title={addLabel}
        >
          <Plus className="size-3.5" aria-hidden />
        </Button>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{addLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-project-type">{tC("title")}</Label>
            <Input
              id="new-project-type"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={t("typeAddPh")}
              className="h-11 rounded-xl"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setAddOpen(false)}
            >
              {tC("cancel")}
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              disabled={!customName.trim()}
              onClick={() => {
                const next = customName.trim();
                if (!next) return;
                setLocalExtras((prev) => (prev.includes(next) ? prev : [...prev, next]));
                onChange(next);
                setCustomName("");
                setAddOpen(false);
              }}
            >
              {tC("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
