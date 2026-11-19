import type { BetterAuthPlugin } from "better-auth";
import { createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { z } from "zod";

// The development-only sign-in (docs/03-ARCHITECTURE.md, section 3): signs in
// the user with the given email, such as a seed user, or creates a new user who
// hasn't completed onboarding. The session and its cookie are made by Better
// Auth itself, so they are the same as after a Google sign-in. createAuth
// registers it only when DEV_SIGN_IN is on, on localhost.

export const DEV_SIGN_IN_PATH = "/dev/sign-in";

export function devSignIn() {
  return {
    id: "dev-sign-in",
    endpoints: {
      devSignIn: createAuthEndpoint(
        DEV_SIGN_IN_PATH,
        {
          method: "POST",
          body: z.object({ email: z.email().max(320) }),
        },
        async (ctx) => {
          const email = ctx.body.email.trim().toLowerCase();
          const adapter = ctx.context.internalAdapter;

          const found = await adapter.findUserByEmail(email);
          const user =
            found?.user ??
            (await adapter.createUser(
              {
                email,
                name: email.split("@")[0] ?? email,
                emailVerified: true,
              },
              { method: "dev-sign-in" },
            ));

          const session = await adapter.createSession(user.id);
          await setSessionCookie(ctx, { session, user });
          return ctx.json({ userId: user.id });
        },
      ),
    },
  } satisfies BetterAuthPlugin;
}
