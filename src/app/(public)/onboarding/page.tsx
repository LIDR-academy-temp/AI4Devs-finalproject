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

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[640px] flex-col gap-6 px-4 py-8 md:px-8">
      <header className="flex flex-col gap-2 text-center">
        <h1 className="text-headline-xl-mobile md:text-headline-xl font-bold">
          {t("title")}
        </h1>
        <p className="text-body-xl text-muted-foreground">{t("intro")}</p>
      </header>
      <OnboardingForm
        language={language}
        defaultCountry={defaultCountry}
        invitationCode={invitationCode}
      />
    </main>
  );
}
