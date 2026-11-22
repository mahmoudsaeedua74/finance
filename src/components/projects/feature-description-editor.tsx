"use client";

import { useId, useRef } from "react";
import { List, ListOrdered } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  continueDescriptionList,
  descriptionListItem,
  FEATURE_DESCRIPTION_MAX_LENGTH,
  formatDescriptionList,
  type DescriptionChange,
  type DescriptionList,
} from "@/lib/feature-description";

export function FeatureDescriptionEditor({ value, onChange, disabled }: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("projects");
  const id = useId();
  const input = useRef<HTMLTextAreaElement>(null);

  function applyChange(field: HTMLTextAreaElement, change: DescriptionChange) {
    const { from, to, replacement, selectionStart, selectionEnd } = change;
    field.focus();
    if (field.value.length - (to - from) + replacement.length > FEATURE_DESCRIPTION_MAX_LENGTH) return;
    field.setRangeText(replacement, from, to);
    field.setSelectionRange(selectionStart, selectionEnd);
    onChange(field.value);
  }

  function formatList(kind: DescriptionList) {
    const field = input.current;
    if (field) applyChange(field, formatDescriptionList(field.value, field.selectionStart, field.selectionEnd, kind));
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{t("featureDescription")}</Label>
      <div className="rounded-lg border border-input">
        <div className="flex flex-wrap gap-1 border-b border-border/60 bg-muted/40 px-1.5 py-1">
          <Button type="button" variant="ghost" size="sm" disabled={disabled}
            onMouseDown={(event) => event.preventDefault()} onClick={() => formatList("bullets")}>
            <List className="size-4" />{t("featureDescriptionBullets")}
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={disabled}
            onMouseDown={(event) => event.preventDefault()} onClick={() => formatList("numbered")}>
            <ListOrdered className="size-4" />{t("featureDescriptionNumbered")}
          </Button>
        </div>
        <Textarea id={id} ref={input} rows={5} dir="auto" value={value} disabled={disabled}
          className="min-h-32 resize-y rounded-t-none border-0 leading-relaxed"
          maxLength={FEATURE_DESCRIPTION_MAX_LENGTH} placeholder={t("featureDescriptionPh")}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey || event.nativeEvent.isComposing) return;
            const field = event.currentTarget;
            if (field.selectionStart !== field.selectionEnd) return;
            const change = continueDescriptionList(field.value, field.selectionStart);
            if (!change) return;
            event.preventDefault();
            applyChange(field, change);
          }} />
      </div>
      <p dir="ltr" className="text-end text-xs text-muted-foreground">{value.length} / {FEATURE_DESCRIPTION_MAX_LENGTH}</p>
    </div>
  );
}

export function FeatureDescriptionContent({ value }: { value: string }) {
  const blocks: { kind: "text" | DescriptionList; lines: string[] }[] = [];
  for (const line of value.split(/\r\n?|\n/)) {
    const item = descriptionListItem(line);
    const kind = !item ? "text" : item.number === null ? "bullets" : "numbered";
    const previous = blocks.at(-1);
    if (previous?.kind === kind) previous.lines.push(line);
    else blocks.push({ kind, lines: [line] });
  }

  return (
    <div className="space-y-1 break-words text-sm leading-relaxed text-muted-foreground">
      {blocks.map(({ kind, lines }, index) => {
        if (kind === "text") return <div key={index} dir="auto" className="whitespace-pre-wrap">{lines.join("\n")}</div>;
        const ListTag = kind === "numbered" ? "ol" : "ul";
        return (
          <ListTag key={index} className={kind === "numbered" ? "list-decimal ps-5" : "list-disc ps-5"}>
            {lines.map((line, itemIndex) => {
              const item = descriptionListItem(line);
              return <li key={itemIndex} value={item?.number ?? undefined}><span dir="auto">{item?.text}</span></li>;
            })}
          </ListTag>
        );
      })}
    </div>
  );
}
