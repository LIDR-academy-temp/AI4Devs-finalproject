import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { getSessionUser } from "../server/auth";
import { browserLanguage, DEFAULT_LANGUAGE } from "../server/http/language";
import {
  isLanguage,
  type Language,
  LANGUAGE_COOKIE,
} from "../shared/languages";
import en from "./en.json";
import es from "./es.json";
import { formats, TIME_ZONE } from "./formats";

// The language of each page (FR-37, docs/02-UX-DESIGN.md, section 2.8): the
// signed-in user's, then the one chosen on Welcome or One last step, then the
// browser's, then Spanish. Addresses carry no language (design decision 6 of
// the T-04 change). Dates and numbers are formatted in the same language
// (FR-38).

const messages = { en, es } as const;

export async function pageLanguage(): Promise<Language> {
  const user = await getSessionUser();
  if (user?.language) return user.language;
  const chosen = (await cookies()).get(LANGUAGE_COOKIE)?.value;
  if (isLanguage(chosen)) return chosen;
  return (
    browserLanguage((await headers()).get("accept-language")) ??
    DEFAULT_LANGUAGE
  );
}

export default getRequestConfig(async () => {
  const locale = await pageLanguage();
  return { locale, messages: messages[locale], formats, timeZone: TIME_ZONE };
});
