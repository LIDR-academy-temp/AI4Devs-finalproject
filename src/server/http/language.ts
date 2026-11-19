import type en from "../../i18n/en.json";
import { translator } from "../translate";
import type { Language, SessionUser } from "./session";

// Error messages come from the translation files (FR-37), in the user's language.

export type ErrorMessageKey = keyof typeof en.errors;

/** Used when neither the user nor the browser names Spanish or English. */
export const DEFAULT_LANGUAGE: Language = "es";

/** The browser's most preferred supported language from Accept-Language, if any. */
export function browserLanguage(header: string | null): Language | null {
  if (!header) return null;
  const ranked = header
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params
        .map((param) => param.trim())
        .find((param) => param.startsWith("q="));
      const quality = q === undefined ? 1 : Number(q.slice(2));
      return {
        primary: tag.trim().toLowerCase().split("-")[0],
        quality: Number.isFinite(quality) ? quality : 0,
        index,
      };
    })
    .filter((entry) => entry.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);
  const match = ranked.find(
    (entry) => entry.primary === "es" || entry.primary === "en",
  );
  return (match?.primary as Language | undefined) ?? null;
}

/** The signed-in user's language, then the browser's, then Spanish (UX design §2.8). */
export function requestLanguage(
  user: SessionUser | null,
  headers: Headers,
): Language {
  return (
    user?.language ??
    browserLanguage(headers.get("accept-language")) ??
    DEFAULT_LANGUAGE
  );
}

export function errorMessage(language: Language, key: ErrorMessageKey): string {
  return translator(language, "errors")(key);
}
