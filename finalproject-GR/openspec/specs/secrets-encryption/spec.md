# secrets-encryption Specification

## Purpose

Lets the platform hold tenant secrets (environment credentials now; integration tokens and AI/LLM keys later) in a form that is recoverable on demand but unreadable without going through the encryption mechanism, scoped per workspace.

## Requirements

### Requirement: Every workspace has a data encryption key from the moment it exists
The system SHALL provision a workspace with its own data encryption key, wrapped by the current master key, at the same time the workspace itself is created.

#### Scenario: A new workspace is created
- **WHEN** a new workspace is created
- **THEN** that workspace has exactly one data encryption key, wrapped by the master key, available for use immediately

### Requirement: A secret value can only be recovered through the encryption mechanism, bound to its workspace and its own identity
The system SHALL encrypt a secret value using its owning workspace's data encryption key, and SHALL bind the workspace id and the secret's own id to the ciphertext so that decryption fails unless both match exactly.

#### Scenario: Round-trip encryption and decryption
- **WHEN** a secret value is encrypted for a given workspace and secret id, then decrypted with that same workspace id and secret id
- **THEN** the original plaintext value is recovered exactly

#### Scenario: Ciphertext does not decrypt under a different workspace
- **WHEN** a secret's ciphertext is decrypted using any workspace id other than the one it was encrypted for
- **THEN** decryption fails

#### Scenario: Ciphertext does not decrypt under a different secret id
- **WHEN** a secret's ciphertext is decrypted using any secret id other than the one it was encrypted for
- **THEN** decryption fails

### Requirement: A workspace's wrapped data encryption key records which master key version wrapped it
The system SHALL record, alongside a workspace's wrapped data encryption key, the version of the master key that wrapped it. Rotating the master key or a workspace's data encryption key is out of scope for this capability as it stands today; recording the version is what makes that rotation possible without a data migration later.

#### Scenario: A workspace's wrapped key identifies its master key version
- **WHEN** a workspace's data encryption key is wrapped by the master key
- **THEN** the stored record identifies which master key version performed the wrapping
