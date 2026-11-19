// The languages the product ships in (FR-37).

export const LANGUAGES = ["es", "en"] as const;

export type Language = (typeof LANGUAGES)[number];

export function isLanguage(value: unknown): value is Language {
  return (LANGUAGES as readonly unknown[]).includes(value);
}

/** The cookie that keeps the language chosen before sign-in (docs/02-UX-DESIGN.md, section 2.8). */
export const LANGUAGE_COOKIE = "language";
