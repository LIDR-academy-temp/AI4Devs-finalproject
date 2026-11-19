import { ShoppingBagIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import {
  devSignInAvailable,
  getSessionUser,
  googleSignInAvailable,
} from "@/server/auth";

import { mainScreenOf } from "../main-screen";
import { WelcomeActions } from "./welcome-actions";
import { WelcomeLanguage } from "./welcome-language";

// Welcome (docs/02-UX-DESIGN.md, section 2.3, screen 1): the product name, a
// language selector, and Continue with Google. A signed-in user goes on to
// onboarding or to their main screen (design decision 4 of the T-05 change).

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser();
  if (user) {
    redirect(user.onboarded ? await mainScreenOf(user.id) : "/onboarding");
  }

  const t = await getTranslations("welcome");
  const { error } = await searchParams;

  return (
    <main className="px-margin py-space-xl md:px-margin-desktop gap-space-lg mx-auto flex min-h-dvh w-full max-w-[640px] flex-col justify-center">
      <WelcomeLanguage />
      <section className="border-border bg-card shadow-card gap-space-xl pt-space-xl pb-space-lg md:p-space-xl flex flex-col rounded-xl border-[1.5px] px-5">
        <div className="gap-space-md flex flex-col items-center text-center">
          <div className="bg-primary text-primary-foreground shadow-card flex size-24 items-center justify-center rounded-xl">
            <ShoppingBagIcon
              className="size-11"
              strokeWidth={1.75}
              aria-hidden
            />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-headline-xl-mobile md:text-headline-xl tracking-tight text-balance">
              {t("title")}
            </h1>
            <p className="text-body-lg text-muted-foreground mx-auto max-w-[30ch] text-balance">
              {t("tagline")}
            </p>
          </div>
        </div>
        <WelcomeActions
          google={googleSignInAvailable()}
          devSignIn={devSignInAvailable()}
          signInError={Boolean(error)}
        />
      </section>
    </main>
  );
}
