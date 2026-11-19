import {
  HouseIcon,
  Link2OffIcon,
  ShoppingCartIcon,
  UserCheckIcon,
  UsersIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { initialsOf } from "@/components/app-shell/app-shell";
import { Button } from "@/components/ui/button";
import {
  devSignInAvailable,
  getSessionUser,
  googleSignInAvailable,
} from "@/server/auth";
import { systemClock } from "@/server/clock";
import { db } from "@/server/db/client";
import {
  InvitationInvalidError,
  NotAvailableError,
} from "@/server/services/errors";
import {
  type InvitationPreview,
  previewInvitation,
} from "@/server/services/invitations";
import { invitationPath, isInvitationCode } from "@/shared/invitations";
import type { Language } from "@/shared/languages";

import { WelcomeActions } from "../../welcome-actions";
import { WelcomeLanguage } from "../../welcome-language";
import { InvitationActions } from "./invitation-actions";

// The Invitation screen (docs/02-UX-DESIGN.md, section 1, flow C, and section
// 2.3, screen 3; design decision 7 of the T-08 change). One state per visit:
// no longer valid, signed out, sent to One last step, already in the group,
// or ready to accept or decline.

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("invitation");
  return { title: t("title") };
}

/** The preview, or null for a link that no longer works or never did (BR-08, BR-13). */
async function loadPreview(
  code: string,
  userId: string | null,
  language: Language,
): Promise<InvitationPreview | null> {
  if (!isInvitationCode(code)) return null;
  try {
    return await previewInvitation(db, systemClock, code, userId, language);
  } catch (error) {
    if (
      error instanceof NotAvailableError ||
      error instanceof InvitationInvalidError
    ) {
      return null;
    }
    throw error;
  }
}

function Screen({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[640px] flex-col justify-center gap-6 px-4 py-8 md:px-8">
      {children}
    </main>
  );
}

const card =
  "border-border bg-card shadow-card flex flex-col gap-4 rounded-xl border-[1.5px] p-5 md:p-6";

/** A state with one message and a way back: no longer valid, or already in the group. */
async function MessageCard({
  icon: Icon,
  tone,
  message,
}: {
  icon: typeof Link2OffIcon;
  tone: "unavailable" | "joined";
  message: string;
}) {
  const tStates = await getTranslations("states");
  return (
    <Screen>
      <section className={`${card} items-center text-center`}>
        <span
          className={
            tone === "unavailable"
              ? "bg-status-unavailable-bg text-status-unavailable-text flex size-16 items-center justify-center rounded-full"
              : "bg-accent text-accent-foreground flex size-16 items-center justify-center rounded-full"
          }
        >
          <Icon className="size-8" aria-hidden />
        </span>
        <h1 className="text-headline-lg font-bold">{message}</h1>
        <Button asChild className="w-full">
          <Link href="/">
            <HouseIcon aria-hidden />
            {tStates("goToStart")}
          </Link>
        </Button>
      </section>
    </Screen>
  );
}

/** Who invites, to which group, and as what (FR-06). */
async function InvitationDetails({
  preview,
  children,
}: {
  preview: InvitationPreview;
  children: ReactNode;
}) {
  const t = await getTranslations("invitation");
  const tCommon = await getTranslations("common");
  const TypeIcon = preview.type === "member" ? UsersIcon : ShoppingCartIcon;
  return (
    <section className={card}>
      <div className="flex items-center gap-3">
        <span
          className="bg-primary text-primary-foreground text-label-lg flex size-12 shrink-0 items-center justify-center rounded-full"
          aria-hidden
        >
          {initialsOf(preview.inviterName, null)}
        </span>
        <h1 className="text-headline-md min-w-0 font-bold break-words">
          {t("invitesYou", { name: preview.inviterName })}
        </h1>
      </div>
      <div className="bg-muted flex flex-col gap-2 rounded-xl p-4">
        <p className="text-body-md text-muted-foreground font-semibold">
          {t("groupLabel")}
        </p>
        <div className="flex items-center gap-3">
          <span className="bg-primary text-primary-foreground flex size-12 shrink-0 items-center justify-center rounded-xl">
            <UsersIcon className="size-6" aria-hidden />
          </span>
          <p className="text-headline-md min-w-0 font-bold break-words">
            {preview.groupName}
          </p>
        </div>
      </div>
      <div className="bg-muted flex flex-wrap items-center justify-between gap-2 rounded-xl p-4">
        <p className="text-label-lg">{t("invitedAs")}</p>
        <p className="bg-primary text-primary-foreground text-label-lg inline-flex items-center gap-2 rounded-full px-3 py-1">
          <TypeIcon className="size-4" aria-hidden />
          {tCommon(`membershipTypes.${preview.type}`)}
        </p>
      </div>
      {children}
    </section>
  );
}

export default async function InvitationPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { code } = await params;
  const user = await getSessionUser();
  const language = (await getLocale()) as Language;
  const t = await getTranslations("invitation");

  const preview = await loadPreview(code, user?.id ?? null, language);
  if (!preview) {
    return (
      <MessageCard
        icon={Link2OffIcon}
        tone="unavailable"
        message={t("noLongerValid")}
      />
    );
  }

  if (!user) {
    const { error } = await searchParams;
    return (
      <Screen>
        <WelcomeLanguage />
        <InvitationDetails preview={preview}>
          <p className="text-body-lg text-muted-foreground">
            {t("signInToAccept")}
          </p>
          <WelcomeActions
            google={googleSignInAvailable()}
            devSignIn={devSignInAvailable()}
            signInError={Boolean(error)}
            returnTo={invitationPath(code)}
          />
        </InvitationDetails>
      </Screen>
    );
  }

  if (!user.onboarded) {
    redirect(`/onboarding?invitation=${code}`);
  }

  if (preview.alreadyInGroup) {
    return (
      <MessageCard
        icon={UserCheckIcon}
        tone="joined"
        message={t("alreadyInGroup")}
      />
    );
  }

  return (
    <Screen>
      <InvitationDetails preview={preview}>
        <InvitationActions code={code} />
      </InvitationDetails>
    </Screen>
  );
}
