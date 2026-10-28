# ADR 0004: Secrets Storage

**Status:** Accepted
**Date:** 2026-09-23
**Amends:** [ADR 0001](0001-tech-stack.md) (adds a layer ADR 0001 did not cover)

## Context

[PRD.md](../../PRD.md) v1.1 has the platform hold secrets on behalf of tenants:

| Secret | Who uses it | Visibility rule (PRD §6.7) |
|---|---|---|
| **Environment credentials** (alias, email, password) | Manual testers log into the app under test; the future automated engine does the same unattended | Masked by default. Contributors and Admins can reveal on demand; every reveal is written to the activity log. Viewers see alias and email only. |
| **Integration tokens** (Jira, GitHub/GitLab) and **AI/LLM API keys** | The platform only | Write-only: never displayed again, replaceable by Project Admins. |

Environment credentials must be **recoverable**, so hashing is not an option. Stored secrets must never appear in reports, exports or logs (PRD §8). Integration tokens and AI keys are placeholders in v1, but the storage design must cover them so they need no rework later.

Disk-level encryption in managed Postgres protects only against a stolen disk. It does not help against a leaked backup, a SQL injection, or an over-broad query, which are the realistic failures here.

## Decision

**Application-level envelope encryption, with the master key in the hosting platform's secret store now and a cloud KMS later.**

1. **Cipher:** AES-256-GCM. Every secret is encrypted in the application before it reaches the database; Postgres only ever stores ciphertext.
2. **Envelope keys:** each workspace has its own **data encryption key (DEK)**, created with the workspace. DEKs are stored in the database wrapped (encrypted) by a **master key**, together with a key version.
3. **Key provider interface:** the application obtains the master key through a `KeyProvider` interface. v1 ships an implementation that reads the master key from the hosting platform's secret store (an environment variable). A KMS-backed implementation can replace it with **no data migration**, because the stored format (wrapped DEK plus key version) is identical.
4. **Binding to context:** the workspace id and the secret's own id are supplied as authenticated additional data. A ciphertext copied to another row or another workspace fails to decrypt.
5. **Secrets stay out of ordinary paths:**
   - List and detail API responses never include secret values. Write-only fields return only whether a value is set.
   - **Reveal** is a dedicated endpoint: it authorises Contributor or Admin, decrypts, writes the activity-log entry in the *same transaction*, is rate-limited, and responds with `Cache-Control: no-store`.
   - Logs, error tracking and request-body capture redact secret fields by name.
   - Reports and exports are built from explicit allow-listed data shapes that have no secret fields.
   - **Background job payloads carry secret ids, never values**; a worker decrypts at the moment of use.
6. **Rotation:** rotating the master key re-wraps the DEKs, a small operation. Rotating a workspace DEK re-encrypts that workspace's secrets in a background job. Ciphertext carries a key version so both can happen without downtime.
7. **Tenancy:** the wrapped-DEK and secret tables are tenant tables under ADR 0003, so they carry `workspace_id` and RLS policies.

## Rationale

- **Envelope encryption** keeps the expensive master key operation rare (unwrapping a DEK) while each secret is encrypted with a cheap local operation, and makes rotation and per-tenant revocation practical.
- **Per-workspace keys** limit the blast radius of a single key compromise and make it possible to render one workspace's secrets unrecoverable.
- **Staging the master key** avoids adding a vendor before launch. ADR 0001 already carries five or six vendors for v1. Because the `KeyProvider` interface and stored format are the same, moving to KMS later is a configuration change, not a migration.
- **Ciphertext binding** closes the case where a database-level bug or attacker moves a secret between tenants.

## Alternatives Considered

- **Cloud KMS from day one.** Non-exportable master key, managed rotation, and an audit log of every unwrap. Rejected for v1 only because it adds a vendor, an account and a network dependency on the request path before any external customer exists. It is the planned destination.
- **Dedicated secrets manager (Vault, Doppler, AWS Secrets Manager).** Purpose-built access policies and versioning. Rejected: an extra service to run or pay for, priced per secret (one per credential across every environment and project), and every reveal becomes an external call.
- **Database-side encryption (for example pgcrypto) with a key from configuration.** Rejected: the key and plaintext pass through SQL where statement logs and query tooling can capture them.
- **Disk-level encryption only.** Not sufficient on its own, as described above; it remains enabled as a baseline.

## Consequences

- **What this protects against:** a leaked database or backup, a SQL injection or over-broad query reading raw tables, and secrets being swapped between rows or tenants. Backups must not store the master key alongside the data.
- **What it does not protect against in v1:** anyone who obtains the application's environment also obtains the master key, and an authorised Contributor can reveal environment passwords by design. The second is why every reveal is audited rather than prevented.
- Rotation of the master key is a manual runbook step until KMS is adopted.
- Every code path that reads or writes secrets must go through the encryption module; direct column access is forbidden and should be caught in review and by a test that inspects the stored value.

## Revisit Triggers

Move to a cloud KMS, and revisit whether per-secret access policies are needed, when **the first external customer's data is stored** or **the automated execution engine ships** (which decrypts unattended on a server), whichever comes first, or earlier if a customer or compliance requirement asks for an auditable, non-exportable key.

## Open Items

- Which secret store holds the v1 master key (depends on the hosting decision in ADR 0001).
- Whether the reveal UI re-masks automatically after a short interval.
- Retention of reveal audit entries (ties into the activity-log immutability decision).
