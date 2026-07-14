"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Settings } from "lucide-react";
import { WalletAccountPanel } from "@/components/wallet/wallet-account-panel";
import { NotificationSettingsPanel } from "@/components/settings/notification-settings-panel";

export default function SettingsPage() {
  const t = useTranslations("settings");

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={<Settings className="size-5" />}
      />

      <WalletAccountPanel variant="card" />
      <NotificationSettingsPanel />
    </div>
  );
}
