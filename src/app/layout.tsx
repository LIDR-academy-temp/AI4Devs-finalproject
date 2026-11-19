import "./globals.css";

import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { connection } from "next/server";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

// The font from DESIGN.md, served from the app's own origin.
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common");
  return { title: t("appName") };
}

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Pages render per request, so Next.js can mark its scripts with the nonce
  // that src/proxy.ts puts in the Content Security Policy.
  await connection();
  const locale = await getLocale();
  return (
    <html lang={locale} className={plusJakartaSans.variable}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
