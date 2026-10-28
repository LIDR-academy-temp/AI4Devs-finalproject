const MASTER_KEY_BYTES = 32;

export interface KeyProvider {
  getMasterKey(version: number): Buffer;
}

/**
 * v1 master key source: SECRETS_MASTER_KEY, base64-encoded (ADR 0004 #3) — the
 * hosting-platform-secret-store stand-in, swappable for a KMS-backed KeyProvider later
 * with no data migration, since the wrapped-DEK format (key version + ciphertext) stays
 * the same either way. Only version 1 exists; validated eagerly so a missing or
 * wrong-length key fails at construction, not on the first encrypt/decrypt call.
 */
export class EnvKeyProvider implements KeyProvider {
  private readonly key: Buffer;

  constructor() {
    const raw = process.env.SECRETS_MASTER_KEY;
    if (!raw) {
      throw new Error('SECRETS_MASTER_KEY must be set');
    }
    const key = Buffer.from(raw, 'base64');
    if (key.length !== MASTER_KEY_BYTES) {
      throw new Error(`SECRETS_MASTER_KEY must decode to ${MASTER_KEY_BYTES} bytes, got ${key.length}`);
    }
    this.key = key;
  }

  getMasterKey(version: number): Buffer {
    if (version !== 1) {
      throw new Error(`Unknown master key version: ${version}`);
    }
    return this.key;
  }
}
