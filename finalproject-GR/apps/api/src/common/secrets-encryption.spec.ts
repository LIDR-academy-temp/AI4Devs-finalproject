import { createWorkspaceDek, decrypt, encrypt } from './secrets-encryption';
import type { KeyProvider } from './key-provider';

const ENVELOPE_PATTERN = /^v1\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/;

function fakeKeyProvider(key: Buffer): KeyProvider {
  return { getMasterKey: () => key };
}

describe('secrets-encryption envelope format', () => {
  it('encrypts and decrypts the same plaintext to the original value', async () => {
    const workspaceId = 'ws-1';
    const secretId = 'secret-1';
    const dekRow = { wrapped_dek: '', master_key_version: 1 };
    const keyProvider = fakeKeyProvider(Buffer.alloc(32, 1));

    const fakeTx = {
      $executeRaw: jest.fn(async () => undefined),
      $queryRaw: jest.fn(async () => [dekRow]),
    };
    const fakePrisma = { $transaction: jest.fn(async (cb: (tx: typeof fakeTx) => Promise<unknown>) => cb(fakeTx)) };

    // Seed a real wrapped DEK via createWorkspaceDek so the test exercises the real wrap format.
    await createWorkspaceDek(fakeTx as never, workspaceId, keyProvider);
    dekRow.wrapped_dek = (fakeTx.$executeRaw.mock.calls[0] as unknown[])[2] as string;

    const ciphertext = await encrypt(fakePrisma as never, workspaceId, secretId, 'super-secret-password', keyProvider);
    expect(ciphertext).toMatch(ENVELOPE_PATTERN);

    const plaintext = await decrypt(fakePrisma as never, workspaceId, secretId, ciphertext, keyProvider);
    expect(plaintext).toBe('super-secret-password');
  });

  it('createWorkspaceDek stores a well-formed envelope string', async () => {
    const fakeTx = { $executeRaw: jest.fn(async () => undefined) };
    const keyProvider = fakeKeyProvider(Buffer.alloc(32, 2));

    await createWorkspaceDek(fakeTx as never, 'ws-2', keyProvider);

    const [, , wrappedDek] = fakeTx.$executeRaw.mock.calls[0] as unknown[];
    expect(wrappedDek).toMatch(ENVELOPE_PATTERN);
  });
});
