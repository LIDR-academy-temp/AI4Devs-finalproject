"use client";

import type { CountryCode } from "libphonenumber-js";
import {
  ArrowRightIcon,
  ChevronDownIcon,
  LoaderCircleIcon,
  MessageCircleIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";

import { rememberLanguage, sendJson } from "@/components/api";
import { FieldError } from "@/components/field-error";
import { FormAlert } from "@/components/form-alert";
import { PhoneField } from "@/components/phone-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { fieldClassName } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/components/ui/utils";
import { fields } from "@/shared/fields";
import { invitationPath } from "@/shared/invitations";
import { LANGUAGES, type Language } from "@/shared/languages";

// The One last step form: language, the age and terms box (BR-01), and the
// WhatsApp number (BR-04). Validated as the user types once they try to
// continue, and on submit; the server validates again (FR-39).

type Errors = { acceptsTerms?: string; whatsappNumber?: string };

export function OnboardingForm({
  language: initialLanguage,
  defaultCountry,
  invitationCode,
}: {
  language: Language;
  defaultCountry?: CountryCode;
  /** The invitation the user came from, which they return to (flow C). */
  invitationCode?: string | undefined;
}) {
  const t = useTranslations("onboarding");
  const tCommon = useTranslations("common");
  const tPhone = useTranslations("phoneField");
  const router = useRouter();
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);

  const [language, setLanguage] = useState(initialLanguage);
  const [acceptsTerms, setAcceptsTerms] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Errors>({});
  const [alert, setAlert] = useState<string>();
  const [pending, setPending] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);

  function check(): Errors {
    const errors: Errors = {};
    if (!acceptsTerms) errors.acceptsTerms = t("acceptsTermsRequired");
    if (!whatsappNumber) errors.whatsappNumber = tPhone("required");
    else if (!fields.phone.safeParse(whatsappNumber).success) {
      errors.whatsappNumber = tPhone("invalid");
    }
    return errors;
  }

  const errors: Errors = attempted ? { ...serverErrors, ...check() } : {};

  // After a failed attempt, move to the first field that needs attention.
  useEffect(() => {
    if (!focusRequest) return;
    formRef.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus();
  }, [focusRequest]);

  function chooseLanguage(next: Language) {
    setLanguage(next);
    rememberLanguage(next);
    // Renders the screen again in the new language, keeping what was entered.
    router.refresh();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setAttempted(true);
    setServerErrors({});
    setAlert(undefined);
    if (Object.keys(check()).length) {
      setFocusRequest((count) => count + 1);
      return;
    }

    setPending(true);
    const result = await sendJson("/me/onboarding", "POST", {
      language,
      whatsappNumber,
      acceptsTerms,
      invitationCode,
    });
    if (result.ok) {
      rememberLanguage(language);
      router.replace(
        invitationCode ? invitationPath(invitationCode) : "/lists",
      );
      return;
    }
    setPending(false);
    if ("offline" in result) {
      setAlert(tCommon("couldNotSave"));
    } else if (result.error.fields) {
      setServerErrors({
        acceptsTerms: result.error.fields.acceptsTerms
          ? t("acceptsTermsRequired")
          : undefined,
        whatsappNumber: result.error.fields.whatsappNumber
          ? tPhone("invalid")
          : undefined,
      });
      setFocusRequest((count) => count + 1);
    } else {
      setAlert(result.error.message || tCommon("couldNotSave"));
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      noValidate
      className="gap-space-lg flex flex-col"
    >
      {alert && <FormAlert>{alert}</FormAlert>}

      <div className="border-border bg-card shadow-card gap-space-lg p-space-md md:p-space-lg flex flex-col rounded-xl border-[1.5px]">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-language`}>{tCommon("language")}</Label>
          {/* Native select, so the phone's own picker opens; only the arrow
              is drawn, in the same place on every browser. */}
          <div className="relative">
            <select
              id={`${id}-language`}
              className={cn(
                fieldClassName,
                "cursor-pointer appearance-none pr-12",
              )}
              value={language}
              disabled={pending}
              onChange={(event) =>
                chooseLanguage(event.target.value as Language)
              }
            >
              {LANGUAGES.map((option) => (
                <option key={option} value={option} lang={option}>
                  {tCommon(`languageNames.${option}`)}
                </option>
              ))}
            </select>
            <ChevronDownIcon
              className="text-muted-foreground pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2"
              aria-hidden
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <PhoneField
            defaultCountry={defaultCountry}
            onChange={(value) => {
              setWhatsappNumber(value);
              setServerErrors({});
            }}
            error={errors.whatsappNumber}
            disabled={pending}
          />
          {/* Help text in a callout, not a live region: it never changes. */}
          <div className="bg-accent text-accent-foreground flex items-start gap-3 rounded-md px-4 py-3">
            <MessageCircleIcon className="mt-0.5 size-5 shrink-0" aria-hidden />
            <p className="text-body-md">{t("whatsappHelp")}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {/* The whole tile is the checkbox's label, so a tap anywhere on it
              toggles the box (DESIGN.md, Checkboxes & Radio Controls). */}
          <Label
            htmlFor={`${id}-terms`}
            className="bg-muted text-body-lg relative min-h-12 cursor-pointer items-start gap-3 rounded-md p-4 font-normal"
          >
            <Checkbox
              id={`${id}-terms`}
              checked={acceptsTerms}
              disabled={pending}
              required
              aria-invalid={errors.acceptsTerms ? true : undefined}
              aria-describedby={
                errors.acceptsTerms ? `${id}-terms-error` : undefined
              }
              onCheckedChange={(checked) => {
                setAcceptsTerms(checked === true);
                setServerErrors({});
              }}
              className="mt-px"
            />
            <span>{t("acceptsTerms")}</span>
          </Label>
          {errors.acceptsTerms && (
            <FieldError id={`${id}-terms-error`}>
              {errors.acceptsTerms}
            </FieldError>
          )}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending && (
          <LoaderCircleIcon className="motion-safe:animate-spin" aria-hidden />
        )}
        {pending ? tCommon("saving") : tCommon("continue")}
        {!pending && <ArrowRightIcon aria-hidden />}
      </Button>
    </form>
  );
}
