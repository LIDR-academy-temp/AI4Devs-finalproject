"use client";

import { CheckCircle2Icon, LogOutIcon, SaveIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";

import { type ApiResult, rememberLanguage, sendJson } from "@/components/api";
import { authClient } from "@/components/auth-client";
import { FormAlert } from "@/components/form-alert";
import { LanguageSwitch } from "@/components/language-switch";
import { PhoneField } from "@/components/phone-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { fields } from "@/shared/fields";
import type { Language } from "@/shared/languages";

// Profile's settings (FR-04). The language and the email setting save as soon
// as they change; the WhatsApp number saves with its button, and can be
// changed but not removed (BR-04). Sign out ends the session (BR-03).

type Changes = {
  language?: Language;
  whatsappNumber?: string;
  receiveEmails?: boolean;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className="border-border bg-card shadow-card flex flex-col gap-4 rounded-xl border-[1.5px] p-4 md:p-6"
    >
      <h2 id={id} className="text-headline-md font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function ProfileForm({
  language: savedLanguage,
  whatsappNumber: savedNumber,
  receiveEmails: savedReceiveEmails,
}: {
  language: Language;
  whatsappNumber: string | null;
  receiveEmails: boolean;
}) {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const tPhone = useTranslations("phoneField");
  const router = useRouter();
  const id = useId();

  const [language, setLanguage] = useState(savedLanguage);
  const [number, setNumber] = useState(savedNumber ?? "");
  const [numberError, setNumberError] = useState<string>();
  const [numberSaved, setNumberSaved] = useState(false);
  const [receiveEmails, setReceiveEmails] = useState(savedReceiveEmails);
  const [alert, setAlert] = useState<string>();
  const [pending, setPending] = useState<keyof Changes | "signOut">();

  async function save(changes: Changes): Promise<ApiResult<unknown>> {
    setAlert(undefined);
    const result = await sendJson("/me", "PATCH", changes);
    if (!result.ok) {
      setAlert(
        "offline" in result
          ? tCommon("couldNotSave")
          : result.error.message || tCommon("couldNotSave"),
      );
    }
    return result;
  }

  async function chooseLanguage(next: Language) {
    const previous = language;
    setLanguage(next);
    setPending("language");
    const result = await save({ language: next });
    setPending(undefined);
    if (!result.ok) {
      setLanguage(previous);
      return;
    }
    rememberLanguage(next);
    // Renders the screen again in the new language.
    router.refresh();
  }

  async function toggleEmails(next: boolean) {
    setReceiveEmails(next);
    setPending("receiveEmails");
    const result = await save({ receiveEmails: next });
    setPending(undefined);
    if (!result.ok) setReceiveEmails(!next);
  }

  function checkNumber(value: string): string | undefined {
    if (!value) return tPhone("required");
    if (!fields.phone.safeParse(value).success) return tPhone("invalid");
    return undefined;
  }

  async function saveNumber(event: FormEvent) {
    event.preventDefault();
    setNumberSaved(false);
    const error = checkNumber(number);
    setNumberError(error);
    if (error) return;
    setPending("whatsappNumber");
    const result = await save({ whatsappNumber: number });
    setPending(undefined);
    if (result.ok) setNumberSaved(true);
    else if (!("offline" in result) && result.error.fields?.whatsappNumber) {
      setNumberError(tPhone("invalid"));
    }
  }

  async function signOut() {
    setAlert(undefined);
    setPending("signOut");
    const { error } = await authClient.signOut().catch(() => ({
      error: true,
    }));
    if (error) {
      setPending(undefined);
      setAlert(t("signOutFailed"));
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      {alert && <FormAlert>{alert}</FormAlert>}

      <Section title={t("contact")}>
        <form onSubmit={saveNumber} noValidate className="flex flex-col gap-4">
          <PhoneField
            initialValue={savedNumber}
            onChange={(value) => {
              setNumber(value);
              setNumberSaved(false);
              if (numberError) setNumberError(checkNumber(value));
            }}
            error={numberError}
            disabled={pending === "whatsappNumber"}
          />
          <p className="text-body-md text-muted-foreground">
            {t("whatsappHelp")}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Button
              type="submit"
              variant="secondary"
              disabled={pending === "whatsappNumber"}
            >
              <SaveIcon aria-hidden />
              {pending === "whatsappNumber"
                ? tCommon("saving")
                : tCommon("save")}
            </Button>
            <p role="status" className="text-body-md text-accent-foreground">
              {numberSaved && (
                <span className="flex items-center gap-2">
                  <CheckCircle2Icon className="size-5" aria-hidden />
                  {tCommon("saved")}
                </span>
              )}
            </p>
          </div>
        </form>
      </Section>

      <Section title={t("preferences")}>
        <LanguageSwitch
          value={language}
          disabled={pending === "language"}
          onChange={chooseLanguage}
        />
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${id}-emails`}>{t("emails")}</Label>
            <p
              id={`${id}-emails-help`}
              className="text-body-md text-muted-foreground"
            >
              {t("emailsHelp")}
            </p>
          </div>
          <Switch
            id={`${id}-emails`}
            className="mt-1"
            checked={receiveEmails}
            disabled={pending === "receiveEmails"}
            aria-describedby={`${id}-emails-help`}
            onCheckedChange={toggleEmails}
          />
        </div>
      </Section>

      <Section title={t("account")}>
        <Button
          variant="secondary"
          className="w-full"
          disabled={pending === "signOut"}
          onClick={signOut}
        >
          <LogOutIcon aria-hidden />
          {pending === "signOut" ? t("signingOut") : t("signOut")}
        </Button>
      </Section>
    </div>
  );
}
