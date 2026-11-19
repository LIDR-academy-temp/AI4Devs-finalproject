import type { Auth } from "./auth";

// The Better Auth endpoints the app serves under /api/auth (docs/05-API.md,
// section 2). Better Auth has many more, such as changing the user's name; any
// other address answers 404, so nothing bypasses the /api/v1 checks.

const BASE_PATH = "/api/auth";

const servedEndpoints: ReadonlyArray<{ method: string; path: string }> = [
  { method: "POST", path: "/sign-in/social" },
  { method: "GET", path: "/callback/google" },
  { method: "GET", path: "/get-session" },
  { method: "POST", path: "/sign-out" },
  { method: "GET", path: "/error" },
  // Registered only when the development sign-in is on; otherwise Better Auth
  // itself answers 404.
  { method: "POST", path: "/dev/sign-in" },
];

/** Whether the app serves this Better Auth endpoint. */
export function servesAuthEndpoint(method: string, pathname: string): boolean {
  if (!pathname.startsWith(`${BASE_PATH}/`)) return false;
  const path = pathname.slice(BASE_PATH.length).replace(/\/+$/, "");
  return servedEndpoints.some(
    (endpoint) => endpoint.method === method && endpoint.path === path,
  );
}

/** Answers the served Better Auth endpoints, and 404 for every other one. */
export function createAuthHandler(auth: () => Auth) {
  return (request: Request): Promise<Response> | Response => {
    if (!servesAuthEndpoint(request.method, new URL(request.url).pathname)) {
      return new Response(null, { status: 404 });
    }
    return auth().handler(request);
  };
}
