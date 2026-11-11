import { randomBytes } from 'node:crypto'
import argon2 from 'argon2'
import type { PasswordHasher } from '../application/ports.js'

/** Argon2 verification. Unknown users are checked against a dummy hash of equal cost (design D7). */
export class Argon2PasswordHasher implements PasswordHasher {
  private constructor(private readonly dummyHash: string) {}

  /** Precomputes the dummy hash once, at startup, with the library's default parameters (same as the seed). */
  static async create(): Promise<Argon2PasswordHasher> {
    return new Argon2PasswordHasher(await argon2.hash(randomBytes(32).toString('hex')))
  }

  async verify(password: string, hash: string | null): Promise<boolean> {
    try {
      const ok = await argon2.verify(hash ?? this.dummyHash, password)
      return hash !== null && ok
    } catch {
      // Malformed stored hash: treat as a mismatch rather than a server error.
      return false
    }
  }
}
