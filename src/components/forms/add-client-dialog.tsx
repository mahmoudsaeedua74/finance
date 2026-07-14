"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { jsonFetch } from "@/lib/fetcher";
import { mergeMutationToasts } from "@/features/_lib/mutation-toast";
import type { ClientOption } from "@/lib/services/client-service";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddClientDialog({ open, onOpenChange }: Props) {
  const t = useTranslations("clients");
  const tC = useTranslations("common");
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!open) {
      setName("");
      setPhone("");
    }
  }, [open]);

  const createClient = useMutation({
    mutationFn: () =>
      jsonFetch<{ data: ClientOption }>("/api/clients", {
        method: "POST",
        body: JSON.stringify({
          clientName: name.trim(),
          phone: phone.trim() || undefined,
        }),
      }),
    ...mergeMutationToasts(
      { loading: tC("saving"), success: t("clientCreated") },
      {
        onSuccess: () => {
          onOpenChange(false);
          void qc.invalidateQueries({ queryKey: ["clients"] });
          void qc.invalidateQueries({ queryKey: ["client-options"] });
          void qc.invalidateQueries({ queryKey: ["client-names"] });
        },
      }
    ),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5" />
            {t("addClientTitle")}
          </DialogTitle>
          <DialogDescription>{t("addClientDesc")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-1">
          <div className="space-y-2">
            <Label htmlFor="add-client-name">{t("clientNameLabel")}</Label>
            <Input
              id="add-client-name"
              className="h-11"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("clientNamePh")}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-client-phone">
              {t("phone")}{" "}
              <span className="text-xs font-normal text-muted-foreground">({t("optional")})</span>
            </Label>
            <Input
              id="add-client-phone"
              type="tel"
              inputMode="tel"
              dir="ltr"
              className="h-11"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("phonePh")}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tC("cancel")}
          </Button>
          <Button
            type="button"
            disabled={!name.trim() || createClient.isPending}
            onClick={() => createClient.mutate(undefined)}
          >
            {t("addClient")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
