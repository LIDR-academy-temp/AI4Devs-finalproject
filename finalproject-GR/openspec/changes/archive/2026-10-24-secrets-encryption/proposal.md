# Proposal

## Why

PRD §6.7 requires environment credentials to be recoverable (not hashed) yet never exposed except through an audited reveal. ADR 0004 settles the approach — application-level envelope encryption, not disk-level or database-level encryption — but nothing implements it yet. Every later secret-holding feature (environment credentials now; integration tokens and AI/LLM keys later) depends on this mechanism existing first, so it has to land before any of them, the same way tenant-context and activity-log landed before the features that use them.

## What Changes

- Add a `workspace_dek` table: one row per workspace, holding that workspace's data encryption key wrapped (encrypted) by the master key, plus a key version (ADR 0004 #2).
- Add a `KeyProvider` interface with a v1 implementation that reads the master key from an environment variable — the hosting-platform-secret-store stand-in ADR 0004 #3 describes, swappable for a KMS-backed implementation later with no data migration, since the stored format (wrapped DEK + key version) is unchanged either way.
- Add `encrypt(workspaceId, secretId, plaintext)` / `decrypt(workspaceId, secretId, ciphertext)` (AES-256-GCM via Node's built-in `crypto`, no new dependency) as the only sanctioned way to touch a secret value, binding workspace id and secret id as authenticated additional data (ADR 0004 #4) so a ciphertext copied to another row or workspace fails to decrypt.
- A workspace's DEK is created atomically with the workspace itself, inside `provisionIdentity`'s existing new-workspace transaction (identity-provisioning) — every workspace has a DEK from the moment it exists, with no retrofit needed once secret-holding features start writing rows.
- Enforce the mechanism boundary the same way `PrismaClient` access already is: an ESLint `no-restricted-imports` rule blocks importing the raw master-key/encrypt/decrypt internals outside the new mechanism module, mirroring ADR 0008's pattern for `withTenantContext`/`withUserContext`.

## Capabilities

### New Capabilities
- `secrets-encryption`: application-level envelope encryption for tenant secrets — per-workspace wrapped data encryption keys, and the only sanctioned encrypt/decrypt path for secret values.

### Modified Capabilities
(none — `workspace_dek` row creation is an internal detail of `provisionIdentity`'s existing transaction, not an externally observable change to identity-provisioning's requirements)

## Impact

- **DB:** new migration adding `workspace_dek` (tenant table per ADR 0003 — `workspace_id`-keyed RLS, same shape as every other tenant table).
- **API:** new `src/common/key-provider.ts` and `src/common/secrets-encryption.ts` (or similarly named) mechanism modules; `provisionIdentity` (identity-provisioning) gains one more insert inside its existing new-workspace transaction branch.
- **Config:** a new required environment variable for the v1 master key (naming decided in design.md).
- **No callers yet:** no controller, no endpoint. The next slice (environment credentials) is this module's first consumer.
