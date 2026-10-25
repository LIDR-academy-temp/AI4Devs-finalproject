import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { createTestPrismaClient } from './helpers/prisma-test-client';
import { provisionIdentity } from '../src/common/provision-identity';
import { decrypt, encrypt } from '../src/common/secrets-encryption';

describe('secrets-encryption (e2e)', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = createTestPrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function provisionWorkspace(): Promise<string> {
    const clerkUserId = `clerk-secrets-${randomUUID()}`;
    const { workspaceId } = await provisionIdentity(prisma, clerkUserId, `${clerkUserId}@example.com`, 'Secrets Test User');
    return workspaceId;
  }

  it('round-trips a secret value for a real provisioned workspace', async () => {
    const workspaceId = await provisionWorkspace();
    const secretId = randomUUID();

    const ciphertext = await encrypt(prisma, workspaceId, secretId, 'super-secret-password');
    const plaintext = await decrypt(prisma, workspaceId, secretId, ciphertext);

    expect(plaintext).toBe('super-secret-password');
  });

  it('fails to decrypt when given a different workspace id', async () => {
    const workspaceId = await provisionWorkspace();
    const otherWorkspaceId = await provisionWorkspace();
    const secretId = randomUUID();

    const ciphertext = await encrypt(prisma, workspaceId, secretId, 'super-secret-password');

    await expect(decrypt(prisma, otherWorkspaceId, secretId, ciphertext)).rejects.toThrow();
  });

  it('fails to decrypt when given a different secret id', async () => {
    const workspaceId = await provisionWorkspace();
    const secretId = randomUUID();
    const otherSecretId = randomUUID();

    const ciphertext = await encrypt(prisma, workspaceId, secretId, 'super-secret-password');

    await expect(decrypt(prisma, workspaceId, otherSecretId, ciphertext)).rejects.toThrow();
  });
});
