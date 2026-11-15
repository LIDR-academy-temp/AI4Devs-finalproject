import { ShoppingBagIcon } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { getSessionUser } from "@/server/auth";
import type { Language } from "@/shared/languages";
import { isInvitationCode } from "@/shared/invitations";
import { browserRegion } from "@/shared/phone";

import { mainScreenOf } from "../../main-screen";
import { OnboardingForm } from "./onboarding-form";

// One last step (docs/02-UX-DESIGN.md, section 2.3, screen 2; FR-02, FR-03).
// Only for a signed-in user who hasn't completed onboarding. A user who came
// from an invitation carries its code, so onboarding skips getting started and
// returns them to it (flow C, step 3).

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onboarding");
  return { title: t("title") };
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (user.onboarded) redirect(await mainScreenOf(user.id));

  const t = await getTranslations("onboarding");
  // The language chosen on Welcome, or the browser's (AC-98).
  const language = (await getLocale()) as Language;
  const defaultCountry = browserRegion(
    (await headers()).get("accept-language"),
  );
  // Only a value shaped like a code is kept, so the return address is always
  // an invitation on this site.
  const { invitation } = await searchParams;
  const invitationCode = isInvitationCode(invitation) ? invitation : undefined;

  // One centered column on every screen size: 16px margins on phones, 32px
  // and up to 640px wide from 768px (DESIGN.md, Responsive Layout Model).
  return (
    <main className="px-margin py-space-xl md:px-margin-desktop gap-space-lg mx-auto flex min-h-dvh w-full max-w-[640px] flex-col justify-center">
      <header className="gap-space-md flex flex-col items-center text-center">
        <div className="bg-primary text-primary-foreground shadow-card flex size-20 items-center justify-center rounded-xl">
          <ShoppingBagIcon className="size-10" strokeWidth={1.75} aria-hidden />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-headline-xl-mobile md:text-headline-xl tracking-tight text-balance">
            {t("title")}
          </h1>
          <p className="text-body-lg text-muted-foreground mx-auto max-w-[36ch] text-balance">
            {t("intro")}
          </p>
        </div>
      </header>
      <OnboardingForm
        language={language}
        defaultCountry={defaultCountry}
        invitationCode={invitationCode}
      />
    </main>
  );
}
