import { isLanguage } from "../../shared/languages";
import type { SessionReader, SessionUser } from "../http/session";
import type { Auth } from "./auth";

// Reads the signed-in user from the Better Auth session (design decision 2 of
// the T-04 change). Better Auth renews a session at most once a day (BR-03) by
// moving its expiry and resending the cookie; the reader copies that cookie to
// the response headers it is given, so the browser keeps the session as long
// as the database does.

type SessionUserFields = {
  id: string;
  language?: unknown;
  onboardedAt?: unknown;
};

function toSessionUser(user: SessionUserFields): SessionUser {
  return {
    id: user.id,
    language: isLanguage(user.language) ? user.language : null,
    onboarded: user.onboardedAt !== null && user.onboardedAt !== undefined,
  };
}

/**
 * A session reader backed by Better Auth. With `renew: false`, it never
 * renews the session, for code that can't send a cookie back, such as pages
 * rendered after the proxy already renewed it.
 */
export function createSessionReader(
  auth: Auth,
  { renew = true }: { renew?: boolean } = {},
): SessionReader {
  return async (headers, responseHeaders) => {
    const { headers: authHeaders, response } = await auth.api.getSession({
      headers,
      query: { disableRefresh: !renew },
      returnHeaders: true,
    });
    if (responseHeaders) {
      for (const cookie of authHeaders.getSetCookie()) {
        responseHeaders.append("set-cookie", cookie);
      }
    }
    return response ? toSessionUser(response.user) : null;
  };
}
