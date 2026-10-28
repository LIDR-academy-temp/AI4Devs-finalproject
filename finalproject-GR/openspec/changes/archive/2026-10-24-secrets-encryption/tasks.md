# Tasks

## 1. Migration: workspace_dek table, RLS, grant

- [x] 1.1 Write a migration creating `workspace_dek` (`workspace_id` as both primary key and tenant column, `wrapped_dek` text, `master_key_version` integer, `created_at`) — verify it applies cleanly on top of `0001`–`0005`
- [x] 1.2 Enable and force RLS, add the `tenant_isolation` policy (same shape as every other tenant table) — verify as `railgun_app`: workspace A's context sees only A's DEK row; no context set returns zero rows
- [x] 1.3 Grant `railgun_app` `SELECT, INSERT` on `workspace_dek` — no `UPDATE`/`DELETE`, since a DEK is never modified or removed in this slice — verify via `information_schema.role_table_grants` that only those two are present
- [x] 1.4 Write the down migration — verify applying then rolling back leaves no orphaned table or policy, and `npm run db:check-rls` still passes afterward

## 2. Master key provider

- [x] 2.1 Implement `KeyProvider` reading `SECRETS_MASTER_KEY` (a 32-byte key, base64-encoded) and `getMasterKey(version: number)` returning it for version `1` — validate the key's length eagerly at construction, not on first use — verify unit test: a missing or wrong-length `SECRETS_MASTER_KEY` throws immediately when the provider is constructed, not on the first `encrypt` call
- [x] 2.2 Add a `SECRETS_MASTER_KEY` value to local dev setup (wherever `DATABASE_URL`/`CLERK_SECRET_KEY` are documented for local dev) — verify `npm run dev -w apps/api` still starts cleanly

## 3. Envelope encryption and DEK provisioning

- [x] 3.1 Implement the ciphertext envelope format (`v<version>.<iv>.<tag>.<ciphertext>`, each part base64) and the underlying AES-256-GCM encrypt/decrypt primitives over it — verify unit test: encrypting then decrypting the same plaintext with the same key and AAD returns the original value exactly
- [x] 3.2 Implement `createWorkspaceDek(tx, workspaceId)`: generates 32 random bytes as the DEK, wraps them with the current master key (AAD = `workspaceId`), and inserts the `workspace_dek` row — verify unit test: produces a well-formed envelope string in `wrapped_dek`
- [x] 3.3 Wire `createWorkspaceDek` into `provisionIdentity`'s new-workspace branch — verify e2e against real Postgres: after sign-up provisions a new workspace, a `workspace_dek` row exists for it
- [x] 3.4 Implement `encrypt(prisma, workspaceId, secretId, plaintext)` / `decrypt(prisma, workspaceId, secretId, ciphertext)`: fetch the workspace's wrapped DEK via `withTenantContext`, unwrap it with the master key, then run AES-256-GCM with AAD `${workspaceId}:${secretId}` — verify e2e against real Postgres: round-trips a value for a real provisioned workspace
- [x] 3.5 Verify binding failures: decrypting with a different `workspaceId` fails (RLS returns no DEK row, or if it somehow matched, GCM tag verification fails); decrypting with a different `secretId` fails GCM tag verification — verify with tests exercising both paths
- [x] 3.6 Add `src/common/secrets-encryption.ts` to `apps/api/eslint.config.js`'s `PrismaClient` allow-list (`key-provider.ts` needs no `PrismaClient` import, so it stays off the list) — verify `npm run lint -w apps/api` passes with no other file importing `PrismaClient` directly

## Workflow follow-up

- Archive the change once reviewed.
- Verify the archived result.
