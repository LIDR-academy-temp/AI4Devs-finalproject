// The security headers in docs/07-SECURITY-AND-TESTING.md, section 1, defined
// once for pages (next.config.ts and src/proxy.ts) and API responses.

/** Sent with every response, pages and API alike. */
export const staticSecurityHeaders = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
} as const;

/** API responses are JSON and load nothing, so their policy allows nothing. */
export const apiContentSecurityPolicy =
  "default-src 'none'; frame-ancestors 'none'";

export const apiSecurityHeaders = {
  ...staticSecurityHeaders,
  "Content-Security-Policy": apiContentSecurityPolicy,
} as const;

/**
 * The policy for pages. Only scripts carrying this request's nonce run, so
 * script injected through user text can't (AC-95). Development adds
 * 'unsafe-eval', which React needs there.
 */
export function pageContentSecurityPolicy(
  nonce: string,
  { development }: { development: boolean },
): string {
  const scripts = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...(development ? ["'unsafe-eval'"] : []),
  ];
  return [
    "default-src 'self'",
    `script-src ${scripts.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}
