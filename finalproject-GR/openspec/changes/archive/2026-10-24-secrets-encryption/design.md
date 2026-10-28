# Design

## Context

See proposal.md - Why. No code in this repo touches secrets yet. The only existing precedent for a "small set of mechanism functions everything else must go through" is ADR 0008's `withTenantContext`/`withUserContext`, enforced by an ESLint `no-restricted-imports` allow-list (`apps/api/eslint.config.js`) — this change follows the same shape for encryption. `provisionIdentity` (identity-provisioning) already runs workspace creation inside one transaction it manages directly, setting `app.workspace_id` itself before inserting the `workspace` row — the natural place to add the DEK insert.

## Goals / Non-Goals

**Goals:**
- A self-contained encryption mechanism: wrap/unwrap a per-workspace DEK, encrypt/decrypt a secret value bound to workspace + secret id, with no caller yet.

**Non-Goals:**
- Any caller (environment credentials, integration tokens, AI keys — later slices).
- The reveal endpoint, its audit log entry, and rate limiting (ADR 0004 #5) — nothing to reveal yet.
- Actually rotating a master key or a workspace DEK (ADR 0004 #6) — only recording the key version so rotation is possible later without a migration.
- A KMS-backed `KeyProvider` (ADR 0004's explicit "later").

## Decisions

**Ciphertext is one self-describing string, not separate columns.** `encrypt()` returns a single opaque string encoding the master key version, the wrapped-DEK's own IV/tag (not needed per-call, see below), the per-call IV, the AES-GCM auth tag, and the ciphertext itself — all base64, dot-delimited (`v1.<iv>.<tag>.<ciphertext>`). This lets any future caller store a secret value in one `text` column without needing to also design iv/tag columns. `decrypt()` is the only thing that ever parses this format.

**The master key comes from `SECRETS_MASTER_KEY`, a 32-byte key, base64-encoded.** Read once at `KeyProvider` construction, decoded and length-validated immediately — a missing or wrong-length key fails fast at startup/first-use, not silently on the first encrypt call. v1 only ever has one version (hardcoded `1`); the `KeyProvider` interface still exposes `getMasterKey(version: number)` (not a bare getter) so a second version can be added later without changing callers.

**`workspace_dek` stores the wrapped DEK using the same envelope format as secrets**, i.e. its `wrapped_dek` column holds a `v<version>.<iv>.<tag>.<ciphertext>` string produced by wrapping 32 random bytes (the DEK) with the master key, under AAD `workspaceId`. One row per workspace; `workspace_id` is both the primary key and the tenant column (ADR 0003's standard shape, RLS policy `workspace_id = current_setting('app.workspace_id')`).

**`encrypt`/`decrypt` take a `PrismaClient` and the already-known `workspaceId`**, mirroring every other mechanism function's signature in this codebase (`withTenantContext`, `resolveProjectWorkspaceId`). Internally they use `withTenantContext` to `SELECT` the workspace's `wrapped_dek` row (one query, no write), unwrap it with the master key, then run AES-256-GCM locally with AAD `${workspaceId}:${secretId}` — binding both ids per ADR 0004 #4. A wrong `workspaceId` either hits RLS (no row — fails before decryption is even attempted) or, if correct, produces a different AAD and fails GCM tag verification; a wrong `secretId` only fails tag verification. Both paths throw.

**DEK creation is a plain function taking a transaction client, not a new `withTenantContext` call.** `createWorkspaceDek(tx: Prisma.TransactionClient, workspaceId: string): Promise<void>` matches `provisionIdentity`'s own style of taking `tx` directly inside its self-managed transaction (it already called `set_config('app.workspace_id', ...)` before this point), rather than opening a second nested transaction.

**Mechanism boundary:** the new module (`src/common/secrets-encryption.ts`, plus `src/common/key-provider.ts` for the master key) is added to the existing ESLint allow-list the same way `project-role.ts` was, since both need direct `PrismaClient`-typed signatures.

## Risks / Trade-offs

- [Master key lives in a plain environment variable, same exposure ADR 0004 already accepts for v1] → Accepted per ADR 0004's Consequences section; not re-litigated here. Revisit trigger is already recorded there (first external customer, or the automated execution engine).
- [Wrong-length or missing `SECRETS_MASTER_KEY` would otherwise fail unpredictably mid-request] → `KeyProvider` validates length eagerly so misconfiguration surfaces at startup, not on a random request.
- [One opaque ciphertext string format now used by every future secret] → Accepted: it's simpler for every caller than per-field iv/tag columns, and the format is versioned so it can change later without touching already-stored data (old ciphertext still names its own version).
