// The development-only sign-in is registered only when DEV_SIGN_IN is true, and
// only on localhost (docs/03-ARCHITECTURE.md, section 3; docs/06-INFRASTRUCTURE.md,
// section 7). This check has no other imports, so the server can run it at start.

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** Whether the setting turns the development sign-in on. */
export function devSignInEnabled(value: string | undefined): boolean {
  return value === "true";
}

/**
 * Throws when the development sign-in is on and the app isn't served from
 * localhost, so a wrong environment variable can't expose it.
 */
export function checkDevSignInSetting({
  devSignIn,
  appUrl,
}: {
  devSignIn: boolean;
  appUrl: string | undefined;
}): void {
  if (!devSignIn) return;
  let hostname: string | undefined;
  try {
    hostname = appUrl ? new URL(appUrl).hostname : undefined;
  } catch {
    hostname = undefined;
  }
  if (!hostname || !LOCAL_HOSTNAMES.has(hostname)) {
    throw new Error(
      `DEV_SIGN_IN is on, but APP_URL (${appUrl ?? "not set"}) isn't on localhost. ` +
        "The development sign-in works only locally; unset DEV_SIGN_IN.",
    );
  }
}
