"use client";

import {
  type CountryCode,
  getCountries,
  getCountryCallingCode,
} from "libphonenumber-js";
import { useLocale, useTranslations } from "next-intl";
import { useId, useMemo, useState, useSyncExternalStore } from "react";

import { composePhone, formatAsTyped, splitPhone } from "@/shared/phone";

import { FieldError } from "./field-error";
import { fieldClassName, Input } from "./ui/input";
import { cn } from "./ui/utils";

// A WhatsApp number with a country selector and formatting as the user types
// (docs/02-UX-DESIGN.md, section 2.8). Country names come from the browser in
// the page's language, so none is written here (DESIGN.md, Content
// Constraints).
//
// The server's names and the browser's differ for a few countries, and so does
// their order, so the full list is built only once the page has hydrated
// (T-36). Until then the select holds the placeholder and the selected
// country; that option's name may still differ, so its text isn't compared
// while hydrating, and it has its own key so the browser's option replaces it.

function subscribeToNothing() {
  return () => {};
}

/** False on the server and while hydrating, true once the page has hydrated. */
function useHydrated() {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
}

function countryLabel(names: Intl.DisplayNames, code: CountryCode) {
  return `${names.of(code) ?? code} (+${getCountryCallingCode(code)})`;
}

type PhoneFieldProps = {
  /** The saved number, in international format, if any. */
  initialValue?: string | null;
  /** The country to start with when there is no saved number. */
  defaultCountry?: CountryCode;
  /** Called with the number to send each time it changes. */
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
};

export function PhoneField({
  initialValue,
  defaultCountry,
  onChange,
  error,
  disabled,
}: PhoneFieldProps) {
  const t = useTranslations("phoneField");
  const locale = useLocale();
  const id = useId();
  const initial = splitPhone(initialValue);
  const [country, setCountry] = useState<CountryCode | undefined>(
    initial.country ?? defaultCountry,
  );
  const [national, setNational] = useState(initial.national);
  const hydrated = useHydrated();

  const names = useMemo(
    () => new Intl.DisplayNames([locale], { type: "region" }),
    [locale],
  );
  const countries = useMemo(() => {
    if (!hydrated) return [];
    return getCountries()
      .map((code) => ({ code, label: countryLabel(names, code) }))
      .sort((a, b) => a.label.localeCompare(b.label, locale));
  }, [hydrated, names, locale]);

  function update(nextCountry: CountryCode | undefined, text: string) {
    setCountry(nextCountry);
    setNational(text);
    onChange(composePhone(nextCountry, text));
  }

  const errorId = `${id}-error`;
  const helpId = `${id}-help`;

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-label-lg mb-2 font-semibold">
        {t("label")} <span aria-hidden>*</span>
      </legend>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex flex-col gap-1 sm:w-2/5">
          <label htmlFor={`${id}-country`} className="text-body-md">
            {t("country")}
          </label>
          <select
            id={`${id}-country`}
            className={cn(fieldClassName, "appearance-auto")}
            value={country ?? ""}
            disabled={disabled}
            onChange={(event) =>
              update(
                (event.target.value || undefined) as CountryCode | undefined,
                formatAsTyped(
                  (event.target.value || undefined) as CountryCode | undefined,
                  national,
                ),
              )
            }
          >
            <option value="">{t("chooseCountry")}</option>
            {hydrated
              ? countries.map(({ code, label }) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))
              : country && (
                  <option
                    key={`initial-${country}`}
                    value={country}
                    suppressHydrationWarning
                  >
                    {countryLabel(names, country)}
                  </option>
                )}
          </select>
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor={`${id}-number`} className="text-body-md">
            {t("number")}
          </label>
          <Input
            id={`${id}-number`}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            value={national}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : helpId}
            onChange={(event) =>
              update(country, formatAsTyped(country, event.target.value))
            }
          />
        </div>
      </div>
      {error ? (
        <FieldError id={errorId}>{error}</FieldError>
      ) : (
        <span id={helpId} className="sr-only">
          {t("required")}
        </span>
      )}
    </fieldset>
  );
}
