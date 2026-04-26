import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-muted-foreground text-sm leading-relaxed">{t("body")}</p>
      <Link
        href="/"
        className={cn(buttonVariants({ size: "lg" }), "min-h-12 touch-manipulation")}
      >
        {t("home")}
      </Link>
    </div>
  );
}
