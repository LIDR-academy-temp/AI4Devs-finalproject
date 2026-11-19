import { describe, expect, it } from "vitest";

import {
  authOptions,
  checkProviderUser,
  fitName,
  SESSION_EXPIRES_IN,
  SESSION_UPDATE_AGE,
} from "../../src/server/auth/auth";
import type { Database } from "../../src/server/db/client";

// The sign-in rules that need no database or provider (FR-01, BR-02, BR-03).
// Google itself is never called (docs/07-SECURITY-AND-TESTING.md, section 2.4).

const options = authOptions({
  db: {} as Database,
  appUrl: "http://localhost:3000",
  secret: "test-only-secret-with-at-least-32-characters",
  google: { clientId: "id", clientSecret: "secret" },
  devSignIn: false,
});

describe("sign-in options", () => {
  it("BR-02 a Google profile without a verified email is refused", () => {
    const source = { method: "oauth" };

    expect(checkProviderUser({ emailVerified: false }, source)).toMatchObject({
      error: "EMAIL_NOT_VERIFIED",
    });
    expect(checkProviderUser({}, source)).toMatchObject({
      error: "EMAIL_NOT_VERIFIED",
    });
    expect(checkProviderUser({ emailVerified: true }, source)).toBeUndefined();
    // The development sign-in creates users with a verified email itself.
    expect(
      checkProviderUser({ emailVerified: false }, { method: "dev-sign-in" }),
    ).toBeUndefined();
  });

  it("BR-02 the check runs for every provider identity", () => {
    const check = options.user.validateUserInfo;
    expect(
      check({
        user: { emailVerified: false },
        source: { method: "oauth", action: "sign-in" },
      }),
    ).toMatchObject({ error: "EMAIL_NOT_VERIFIED" });
  });

  it("BR-02 an identity is matched by the provider's ID, not by email", () => {
    expect(options.account.accountLinking).toEqual({
      disableImplicitLinking: true,
    });
  });

  it("BR-03 sessions last 30 days from the last use, renewed at most daily", () => {
    expect(SESSION_EXPIRES_IN).toBe(30 * 24 * 60 * 60);
    expect(SESSION_UPDATE_AGE).toBe(24 * 60 * 60);
    expect(options.session).toEqual({
      expiresIn: SESSION_EXPIRES_IN,
      updateAge: SESSION_UPDATE_AGE,
      cookieCache: { enabled: false },
    });
  });

  it("T-04 the origin check stays on and only the app is trusted", () => {
    expect(options.advanced.disableOriginCheck).toBe(false);
    expect(options.trustedOrigins).toEqual(["http://localhost:3000"]);
    expect(options.advanced.ipAddress).toEqual({ disableIpTracking: true });
  });

  it("T-04 cookies are Secure only on https", () => {
    expect(options.advanced.useSecureCookies).toBe(false);
    const production = authOptions({
      db: {} as Database,
      appUrl: "https://comproparati.example",
      secret: "test-only-secret-with-at-least-32-characters",
      devSignIn: false,
    });
    expect(production.advanced.useSecureCookies).toBe(true);
  });

  it("T-04 Google is registered only with its credentials", () => {
    expect(Object.keys(options.socialProviders)).toEqual(["google"]);
    const withoutGoogle = authOptions({
      db: {} as Database,
      appUrl: "http://localhost:3000",
      secret: "test-only-secret-with-at-least-32-characters",
      devSignIn: false,
    });
    expect(withoutGoogle.socialProviders).toEqual({});
  });

  it("BR-32 a provider's name is shortened to 100 characters", () => {
    expect(fitName("Ana García")).toBe("Ana García");
    expect(Array.from(fitName("ñ".repeat(150)))).toHaveLength(100);
    expect(fitName(undefined)).toBe("");
  });
});
