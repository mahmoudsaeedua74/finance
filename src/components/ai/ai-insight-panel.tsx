"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { jsonFetch } from "@/lib/fetcher";
import { toast } from "sonner";

export function AiInsightPanel({
  surface,
}: {
  surface: "projects" | "transactions" | "reports";
}) {
  const t = useTranslations("ai");
  const locale = useLocale();
  const [text, setText] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () =>
      jsonFetch<{ data: { text: string } }>("/api/ai/insights", {
        method: "POST",
        body: JSON.stringify({ surface, locale }),
      }),
    onSuccess: (res) => setText(res.data.text),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="border-sky-500/25 bg-sky-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-sky-700 dark:text-sky-400" />
          {t("title")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{t(`desc_${surface}`)}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          type="button"
          size="sm"
          onClick={() => mut.mutate()}
          disabled={mut.isPending}
          className="gap-1.5"
        >
          {mut.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          {t("run")}
        </Button>
        {text && (
          <div className="whitespace-pre-wrap rounded-xl border border-border/50 bg-background/80 p-3 text-sm leading-relaxed">
            {text}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
