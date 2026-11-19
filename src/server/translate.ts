import { createTranslator } from "next-intl";

import en from "../i18n/en.json";
import es from "../i18n/es.json";
import type { Language } from "../shared/languages";

// Text the server produces itself, such as error messages and the names of a new
// user's group and list, comes from the translation files (FR-37).

const messages = { en, es } as const;

type Messages = typeof en;

/** A translator for one section of the message files, in the given language. */
export function translator<N extends keyof Messages>(
  language: Language,
  namespace: N,
) {
  return createTranslator({
    locale: language,
    messages: messages[language] as Messages,
    namespace,
  });
}
