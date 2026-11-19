import { createAuthClient } from "better-auth/react";

// Better Auth's browser client, for Continue with Google and Sign out
// (design decision 5 of the T-04 change). It talks to /api/auth on the same
// origin.
export const authClient = createAuthClient({ basePath: "/api/auth" });
