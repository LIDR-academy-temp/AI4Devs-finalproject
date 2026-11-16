import {
  AsYouType,
  type CountryCode,
  isSupportedCountry,
  parsePhoneNumberFromString,
} from "libphonenumber-js";

// The WhatsApp number field's logic (BR-04, BR-32; docs/02-UX-DESIGN.md,
// section 2.8: a country selector and automatic formatting). The server
// validates the result again with `fields.phone`.

/** The region in the browser's most preferred language, such as US from es-US. */
export function browserRegion(
  acceptLanguage: string | null,
): CountryCode | undefined {
  for (const part of (acceptLanguage ?? "").split(",")) {
    const [tag = ""] = part.trim().split(";");
    const region = tag.split("-")[1]?.toUpperCase();
    if (region && isSupportedCountry(region)) return region;
  }
  return undefined;
}

/**
 * The number to send: international format when it can be read, with the
 * country's code added when the user typed a national number, or the text as
 * typed, which the validation then points out.
 */
export function composePhone(
  country: CountryCode | undefined,
  text: string,
): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const parsed = parsePhoneNumberFromString(
    trimmed,
    trimmed.startsWith("+") ? undefined : country,
  );
  return parsed?.number ?? trimmed;
}

/** Formats the number as the user types it, in the chosen country's style. */
export function formatAsTyped(
  country: CountryCode | undefined,
  text: string,
): string {
  // Deleting a formatting character shouldn't put it straight back.
  if (/[\s()-]$/.test(text)) return text;
  return new AsYouType(text.trim().startsWith("+") ? undefined : country).input(
    text,
  );
}

/** Splits a saved number into its country and how it is written there. */
export function splitPhone(value: string | null | undefined): {
  country: CountryCode | undefined;
  national: string;
} {
  const parsed = value ? parsePhoneNumberFromString(value) : undefined;
  if (!parsed?.country) return { country: undefined, national: value ?? "" };
  return { country: parsed.country, national: parsed.formatNational() };
}

/** An E.164 number as people write it internationally, for example +1 202 555 0103. */
export function formatInternational(e164: string): string {
  return parsePhoneNumberFromString(e164)?.formatInternational() ?? e164;
}
