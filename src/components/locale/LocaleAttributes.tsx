"use client";

import { useLayoutEffect } from "react";

type Props = { locale: string };

/**
 * Sets <html> lang and dir for RTL without duplicating a second <html> (Next.js constraint).
 */
export function LocaleAttributes({ locale }: Props) {
  useLayoutEffect(() => {
    const dir = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.setAttribute("lang", locale);
    document.documentElement.setAttribute("dir", dir);
  }, [locale]);
  return null;
}
