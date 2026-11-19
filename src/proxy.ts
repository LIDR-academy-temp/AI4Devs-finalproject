import { type NextRequest, NextResponse } from "next/server";

import { readSession } from "./server/auth";
import { pageContentSecurityPolicy } from "./server/http/security-headers";

// Runs before every page request:
// - Gives the request its own nonce and the Content Security Policy that allows
//   only scripts carrying it (docs/07-SECURITY-AND-TESTING.md, section 1).
//   Next.js reads the policy from the request headers and adds the nonce to its
//   own scripts. API responses set their own policy in the route wrapper.
// - Renews the session when it is due and sends the new cookie, which pages
//   can't do while rendering (BR-03, design decision 2 of the T-04 change).

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = pageContentSecurityPolicy(nonce, {
    development: process.env.NODE_ENV === "development",
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);

  const sessionHeaders = new Headers();
  await readSession(request.headers, sessionHeaders);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  for (const cookie of sessionHeaders.getSetCookie()) {
    response.headers.append("set-cookie", cookie);
  }
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api/|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
