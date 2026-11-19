import { getAuth } from "@/server/auth";
import { createAuthHandler } from "@/server/auth/handler";

// Better Auth's endpoints under /api/auth: only those the app uses
// (docs/05-API.md, section 2).

const handle = createAuthHandler(getAuth);

export const GET = handle;
export const POST = handle;
