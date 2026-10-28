import { createClerkClient } from '@clerk/backend';

/** Used only for profile lookups (email, name) — token verification is the guard's job. */
export const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
