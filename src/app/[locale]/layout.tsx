import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Cairo } from "next/font/google";
import type { ReactNode } from "react";
import { routing } from "@/i18n/routing";
import { LocaleAttributes } from "@/components/locale/LocaleAttributes";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-arabic",
  weight: ["400", "500", "600", "700"],
});

type Props = { children: ReactNode; params: { locale: string } };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params: { locale } }: Props) {
  if (!routing.locales.includes(locale as "en" | "ar")) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={messages}>
      <LocaleAttributes locale={locale} />
      <div
        className={
          locale === "ar" ? `min-w-0 ${cairo.className} antialiased` : "min-w-0"
        }
      >
        {children}
      </div>
    </NextIntlClientProvider>
  );
}
