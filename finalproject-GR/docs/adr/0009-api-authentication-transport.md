# ADR 0009: API Authentication Transport

**Status:** Accepted
**Date:** 2026-10-23
**Amends:** [ADR 0002](0002-authentication-and-workspace-membership.md) (resolves Open Item: how the browser authenticates to the API)

## Context

ADR 0002 settled identity on Clerk but left open how the browser carries that identity to the NestJS API, given [ADR 0001](0001-tech-stack.md)'s hosting split: Next.js on Vercel, NestJS on Railway or Render — different hosts, with Vercel generating a new, random preview URL for every pull request. [ADR 0005](0005-realtime-and-background-jobs-v1.md) separately needs the same answer for SSE streams, since the browser's native `EventSource` cannot send an `Authorization` header.

This ADR resolves the transport for ordinary (non-streaming) requests now, since it is required before any API skeleton or frontend data layer can be built (open-questions.md A2). The SSE-specific half of A2 — the fetch-based streaming client — is deferred along with SSE itself to the full roadmap's Phase 6, but the mechanism decided here is designed to extend to it without rework.

## Decision

**Bearer token.** The frontend attaches the signed-in user's Clerk session token as `Authorization: Bearer <token>` on every API request; the API verifies it against Clerk's JWKS.

- **Frontend:** `@clerk/nextjs`'s `getToken()` supplies a short-lived session JWT; a single shared API client (a thin fetch wrapper, not scattered per call site) attaches it to every request and lets the Clerk SDK handle refresh.
- **API:** a NestJS guard verifies the JWT's signature against Clerk's JWKS (fetched over HTTPS and cached, no secret shared between the two hosts), checks expiry and issuer, and resolves the Clerk user id. This guard runs before the tenant-context guard from [ADR 0008](0008-tenant-context-implementation.md), since the latter needs the resolved user id to look up the active workspace.
- **No cookies on the API's auth path.** Clerk's own first-party cookie on the Next.js app (used internally by Clerk's SDK for the frontend's own session) is unrelated and stays as Clerk's default; it is never read by the NestJS API.

## Rationale

- **Host-independent.** A bearer token needs no shared cookie domain, so it is unaffected by Vercel's per-PR preview URLs or by the API and frontend living on separate providers.
- **No CSRF surface to design around.** Cookie-based cross-site auth would need `SameSite=None; Secure` plus explicit CSRF protection; a bearer token sent in a header by first-party JavaScript has no equivalent exposure.
- **One mechanism for requests and the later SSE stream.** ADR 0005 already anticipated this: native `EventSource` can't send headers, so SSE needs a fetch-based client regardless. That client reuses the same `getToken()` call and the same API-side JWT verification — nothing new is designed when SSE is added in the full roadmap.
- **Matches open-questions.md's own suggested resolution** (A2: "Default: bearer token from Clerk plus a fetch-based SSE client").

## Alternatives Considered

- **Shared session cookie across both hosts.** Would let the browser authenticate without client-side token handling. Rejected: requires a fixed shared cookie domain, which Vercel's randomized preview URLs make impractical without a custom per-PR domain-aliasing setup, and adds `SameSite=None` CSRF considerations the bearer token avoids entirely.
- **A backend-for-frontend (BFF) proxy inside the Next.js app** that holds the session and forwards authenticated requests to the API server-side, keeping the token off the browser. Rejected for now: adds a layer and a hop to every request for a threat (token theft via XSS) not currently prioritized; revisit if that threat model changes.

## Consequences

- The frontend's API client is a single shared wrapper, not ad hoc `fetch` calls, so token-attachment logic exists in exactly one place.
- The NestJS auth guard depends on network access to Clerk's JWKS endpoint (cached after first fetch); API tests need either a real Clerk test instance or a mocked JWKS response.
- When SSE is introduced (full roadmap Phase 6), its client reuses this same token mechanism — no new ADR needed for stream auth specifically, only an implementation note.

## Revisit Triggers

- Token theft via XSS becomes a concern that outweighs the added complexity of a BFF proxy.
- Clerk's JWKS verification adds measurable latency per request at scale.

## Sources

- Clerk documentation: session tokens and `getToken()` (`clerk.com/docs`), referenced in ADR 0002.
