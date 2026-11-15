"use client";

import { useRouter } from "next/navigation";

import { rememberLanguage } from "@/components/api";
import { LanguageSwitch } from "@/components/language-switch";

// The language choice on Welcome, kept in a cookie until onboarding saves it
// (docs/02-UX-DESIGN.md, section 2.8). Refreshing switches the screen at once.
export function WelcomeLanguage() {
  const router = useRouter();
  return (
    <LanguageSwitch
      variant="compact"
      className="items-end self-end"
      onChange={(language) => {
        rememberLanguage(language);
        router.refresh();
      }}
    />
  );
}
