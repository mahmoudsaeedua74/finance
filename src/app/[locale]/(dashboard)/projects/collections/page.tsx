"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProjectCollectionsList } from "@/components/projects/project-collections-banner";

export default function ProjectCollectionsPage() {
  const t = useTranslations("projects");

  return (
    <div className="store-section w-full space-y-4">
      <Link
        href="/projects"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5 -ms-1")}
      >
        <ArrowLeft className="size-4 rtl:rotate-180" />
        {t("collectionsBack")}
      </Link>

      <PageHeader
        title={t("collectionsPageTitle")}
        description={t("collectionsPageDesc")}
        icon={<CalendarClock className="size-5" />}
      />

      <ProjectCollectionsList />
    </div>
  );
}
