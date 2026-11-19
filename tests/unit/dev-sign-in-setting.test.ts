import { describe, expect, it } from "vitest";

import {
  checkDevSignInSetting,
  devSignInEnabled,
} from "../../src/server/auth/dev-sign-in-setting";
import { authOptions } from "../../src/server/auth/auth";
import type { Database } from "../../src/server/db/client";

// The development-only sign-in works only on localhost (docs/03-ARCHITECTURE.md,
// section 3).

describe("development sign-in setting", () => {
  it("T-04 the app refuses to start with the setting on outside localhost", () => {
    for (const appUrl of [
      "http://localhost:3000",
      "http://127.0.0.1:3100",
      "http://[::1]:3000",
    ]) {
      expect(() =>
        checkDevSignInSetting({ devSignIn: true, appUrl }),
      ).not.toThrow();
    }
    for (const appUrl of [
      "https://comproparati.vercel.app",
      "http://localhost.example.com",
      "not a url",
      undefined,
    ]) {
      expect(() => checkDevSignInSetting({ devSignIn: true, appUrl })).toThrow(
        /DEV_SIGN_IN/,
      );
    }
  });

  it("T-04 with the setting off, any address is allowed", () => {
    expect(() =>
      checkDevSignInSetting({
        devSignIn: false,
        appUrl: "https://comproparati.vercel.app",
      }),
    ).not.toThrow();
  });

  it("T-04 only the exact value true turns it on", () => {
    expect(devSignInEnabled("true")).toBe(true);
    for (const value of [undefined, "", "false", "1", "TRUE", "yes"]) {
      expect(devSignInEnabled(value)).toBe(false);
    }
  });

  it("T-04 building the sign-in refuses the setting outside localhost", () => {
    expect(() =>
      authOptions({
        db: {} as Database,
        appUrl: "https://comproparati.vercel.app",
        secret: "test-only-secret-with-at-least-32-characters",
        devSignIn: true,
      }),
    ).toThrow(/DEV_SIGN_IN/);
  });
});
