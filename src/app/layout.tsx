import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AppProviders } from "@/components/providers/app-providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-mono-legacy",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Personal Finance",
  description: "Track income, expenses, and projects in one place.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "oklch(0.98 0 0)" },
    { media: "(prefers-color-scheme: dark)", color: "oklch(0.16 0 0)" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)} suppressHydrationWarning>
      <body
        className={cn(
          geistMono.variable,
          "min-h-dvh overflow-x-hidden antialiased [text-size-adjust:100%] supports-[padding:max(0px)]:pl-[max(0px,env(safe-area-inset-left))] supports-[padding:max(0px)]:pr-[max(0px,env(safe-area-inset-right))]"
        )}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
