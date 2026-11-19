import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { loadShell } from "../shell-data";

import { ProfileForm } from "./profile-form";

// Profile (docs/02-UX-DESIGN.md, section 2.3, screen 12; FR-04): language,
// WhatsApp number, the email setting, and sign out. Groups, creating a group,
// deleting the account, and reporting a problem come in milestone 2.

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile");
  return { title: t("title") };
}

export default async function ProfilePage() {
  const t = await getTranslations("profile");
  const { user: me } = await loadShell();

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-headline-xl-mobile md:text-headline-xl font-bold">
          {t("title")}
        </h1>
        {me.name && <p className="text-body-xl font-medium">{me.name}</p>}
        {me.email && (
          <p className="text-body-md text-muted-foreground break-all">
            {me.email}
          </p>
        )}
      </header>
      <ProfileForm
        language={me.language ?? "es"}
        whatsappNumber={me.whatsappNumber}
        receiveEmails={me.receiveEmails}
      />
    </>
  );
}
