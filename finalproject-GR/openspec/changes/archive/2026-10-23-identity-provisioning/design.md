# Design

## Context

See proposal.md for motivation. Builds on `tenant-base-schema` (`user`/`workspace`/`workspace_membership` tables and their RLS policies, `withTenantContext`) and `activity-log`. Constraints: ADR 0002 (Clerk is identity-only; our Postgres owns workspace/membership; provisioning is one atomic, idempotent transaction on first authenticated request) and ADR 0009 (bearer token, verified against Clerk's JWKS).

## Goals / Non-Goals

**Goals:**
- Every protected request resolves to a verified Clerk identity before anything else runs.
- First contact for a new identity provisions exactly one `user`, one `workspace`, one `Owner` `workspace_membership`, atomically; repeat contact changes nothing.
- `withUserContext` exists and has a real caller.

**Non-Goals:**
- No authorization policy module yet (next slice) — this change only resolves *who*, not *what they're allowed to do*.
- No invitation flow, no acting on the email-verified flag beyond reading it.
- No frontend pages.

## Decisions

### A schema gap this change surfaces: `user`'s RLS policy needs widening

`tenant-base-schema` gave `"user"` one policy, `self_access` (`id = app.user_id`) — correct for "fetch my own row once I know my internal id," but this change's actual first step is "find my row by `clerk_user_id`, before I know my internal id at all." Under the existing policy, that lookup always returns zero rows, found or not — there's nothing to key the lookup on yet.

This needs a second permissive condition on the same policy, parallel to the `workspace_membership` dual-policy fix from `tenant-base-schema` (which resolved open-questions.md A5 the same way): widen `self_access`'s `USING` clause to also match on `clerk_user_id` against a new setting, `app.clerk_user_id`, which *is* known immediately after JWT verification — no chicken-and-egg problem, since it comes from Clerk, not from our own table:
```sql
DROP POLICY self_access ON "user";
CREATE POLICY self_access ON "user"
  USING (
    id = nullif(current_setting('app.user_id', true), '')::uuid
    OR clerk_user_id = nullif(current_setting('app.clerk_user_id', true), '')
  )
  WITH CHECK (id = nullif(current_setting('app.user_id', true), '')::uuid);
```
`WITH CHECK` is deliberately left narrower than `USING` — it still only governs inserts via the existing bootstrap pattern (generate the id client-side, set `app.user_id` to it, then insert), which doesn't need the `clerk_user_id` branch. A new migration (`0003`) makes this change; `tenant-base-schema`'s migration is already archived and isn't rewritten.

### `withUserContext`

```ts
async function withUserContext<T>(prisma: PrismaClient, userId: string, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
    return fn(tx);
  });
}
```
Exactly parallel to `withTenantContext`. Used once the caller already knows their own internal `userId` (e.g. `GET /me`'s own reads after identity resolution). It is **not** used for the first-contact provisioning path below — see why.

### Provisioning is its own function, not a composition of the two helpers

`withUserContext` and `withTenantContext` each open their **own** `$transaction`. Provisioning a brand-new identity needs `app.user_id` set for the `user` and `workspace_membership` inserts and `app.workspace_id` set for the `workspace` insert, all inside **one** transaction (ADR 0002's atomicity requirement) — composing the two helpers would mean two separate transactions, which breaks that. So `provisionIdentity` manages its own transaction directly, setting each context variable in sequence as it's needed (a setting, once set with `set_config(..., true)`, stays set for the rest of that transaction — setting `app.workspace_id` later doesn't clear `app.user_id`):

```ts
async function provisionIdentity(prisma: PrismaClient, clerkUserId: string, email: string, displayName: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.clerk_user_id', ${clerkUserId}, true)`;
    const existing = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "user" WHERE clerk_user_id = ${clerkUserId}`;
    if (existing.length > 0) {
      const userId = existing[0].id;
      await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
      const membership = await tx.$queryRaw<{ workspace_id: string }[]>`
        SELECT workspace_id FROM workspace_membership WHERE user_id = ${userId}::uuid AND role = 'Owner' LIMIT 1`;
      return { userId, workspaceId: membership[0].workspace_id, created: false };
    }

    const userId = randomUUID();
    const workspaceId = randomUUID();
    await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
    await tx.$executeRaw`INSERT INTO "user" (id, clerk_user_id, display_name, email) VALUES (${userId}::uuid, ${clerkUserId}, ${displayName}, ${email})`;
    await tx.$executeRaw`SELECT set_config('app.workspace_id', ${workspaceId}, true)`;
    await tx.$executeRaw`INSERT INTO workspace (id, name) VALUES (${workspaceId}::uuid, ${`${displayName}'s Workspace`})`;
    await tx.$executeRaw`INSERT INTO workspace_membership (workspace_id, user_id, role) VALUES (${workspaceId}::uuid, ${userId}::uuid, 'Owner')`;
    return { userId, workspaceId, created: true };
  });
}
```
Idempotency falls out of the lookup-first structure: a second call for the same `clerkUserId` takes the `existing.length > 0` branch and creates nothing. No unique-constraint-violation race handling is added in this change — see Risks.

### Auth guard

Uses `@clerk/backend`'s own token verification (`verifyToken` / `authenticateRequest`), not a hand-rolled JWKS + `jose` implementation — Clerk's SDK already encodes clock-skew tolerance and claim validation correctly; re-deriving that ourselves risks a subtly wrong security-critical check for no real benefit (ADR 0001's own stance: Clerk is there specifically to not hand-roll this). The guard resolves the Clerk user id (`sub` claim) and, since the default session token may not carry email/display name as claims, calls Clerk's Users API (`clerkClient.users.getUser`) to fetch them — avoiding a dependency on custom session-claim configuration in the Clerk dashboard that nothing here controls.

`GET /me` calls `provisionIdentity` (first contact) — which, on the "existing" branch, is really just a resolve — then returns the resolved id/name/email/workspaceId. There's no separate "provisioning" endpoint; resolution and provisioning are the same code path, matching ADR 0002's "on first authenticated request."

## Risks / Trade-offs

- **[Risk, corrected during apply] Getting a real Clerk session JWT without a live account or a browser isn't a simple backend call.** This design originally assumed `@clerk/backend`'s `createTestingToken()` could stand in for one; it can't — that call creates a bot-detection bypass token for browser-driven E2E flows, not a session JWT. A genuine session token requires either an actual sign-in (frontend SDK or hosted UI) or Clerk's sign-in-token ticket flow redeemed against their Frontend API. → **Resolution:** `GET /me`'s integration tests mock `verifyToken` and the Clerk Users-API profile fetch at the boundary (same technique as the guard's own unit test) while exercising everything we actually own for real — the guard logic, `provisionIdentity`, real Postgres. Clerk's own JWT verification is their tested library code, not ours to re-verify. Genuine end-to-end verification against live Clerk JWKS, once a Clerk account exists, is a manual follow-up check, not a blocking automated test in this change.
- **[Risk]** No race-condition handling between the lookup and the insert in `provisionIdentity` — two concurrent first-contact requests for the same brand-new Clerk identity could both take the "not found" branch and collide on `user.clerk_user_id`'s unique constraint, with one erroring. → **Mitigation:** accepted for this change; a real double sign-in-at-the-same-instant race is rare, and the failure mode is a clean constraint violation (the second request can simply retry and take the "found" branch), not silent duplication. Revisit if it's ever observed in practice.
- **[Risk]** `provisionIdentity` writes raw SQL by hand (no Prisma models yet, same as every prior change) — a typo in a column name fails at runtime, not at compile time. → **Mitigation:** covered by this change's own integration tests; unchanged risk profile from `tenant-base-schema`/`activity-log`.

## Migration Plan

Additive: one new migration (`0003`) widening `user`'s RLS policy — no existing rows to migrate (no sign-ups have ever happened). Rollback restores the original single-condition policy.
