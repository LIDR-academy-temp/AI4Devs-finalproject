import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { withTenantContext } from './tenant-context';
import { EnvKeyProvider, KeyProvider } from './key-provider';

const DEK_BYTES = 32;
const IV_BYTES = 12;
const ENVELOPE_VERSION = 1;
const ENVELOPE_PATTERN = /^v(\d+)\.([^.]+)\.([^.]+)\.([^.]+)$/;

let defaultKeyProvider: KeyProvider | undefined;

/** Constructed lazily, on first actual use — not at module load, so importing this file
 * never requires SECRETS_MASTER_KEY to be set (only calling it does). */
function getDefaultKeyProvider(): KeyProvider {
  if (!defaultKeyProvider) {
    defaultKeyProvider = new EnvKeyProvider();
  }
  return defaultKeyProvider;
}

/**
 * One opaque, self-describing ciphertext string (design.md) — a format version plus
 * base64 iv/tag/ciphertext, dot-delimited. Used both to wrap a workspace's DEK with the
 * master key and to encrypt a secret value with that DEK; `aad` is what tells the two
 * apart (workspaceId alone for the former, `workspaceId:secretId` for the latter).
 */
function sealEnvelope(key: Buffer, aad: string, plaintext: Buffer): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(aad));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v${ENVELOPE_VERSION}.${iv.toString('base64')}.${tag.toString('base64')}.${ciphertext.toString('base64')}`;
}

function openEnvelope(envelope: string, key: Buffer, aad: string): Buffer {
  const match = ENVELOPE_PATTERN.exec(envelope);
  if (!match) {
    throw new Error('Malformed ciphertext envelope');
  }
  const [, , ivB64, tagB64, ciphertextB64] = match;
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
  decipher.setAAD(Buffer.from(aad));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextB64, 'base64')), decipher.final()]);
}

/**
 * Creates and stores a workspace's data encryption key (ADR 0004 #2). Takes a
 * transaction client directly, matching provisionIdentity's own style of running inside
 * a transaction it already manages — not a second nested withTenantContext.
 */
export async function createWorkspaceDek(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  keyProvider: KeyProvider = getDefaultKeyProvider(),
): Promise<void> {
  const dek = randomBytes(DEK_BYTES);
  const masterKeyVersion = 1;
  const wrappedDek = sealEnvelope(keyProvider.getMasterKey(masterKeyVersion), workspaceId, dek);

  await tx.$executeRaw`
    INSERT INTO workspace_dek (workspace_id, wrapped_dek, master_key_version)
    VALUES (${workspaceId}::uuid, ${wrappedDek}, ${masterKeyVersion})
  `;
}

async function getWorkspaceDek(prisma: PrismaClient, workspaceId: string, keyProvider: KeyProvider): Promise<Buffer> {
  const rows = await withTenantContext(prisma, workspaceId, (tx) =>
    tx.$queryRaw<{ wrapped_dek: string; master_key_version: number }[]>`
      SELECT wrapped_dek, master_key_version FROM workspace_dek WHERE workspace_id = ${workspaceId}::uuid
    `,
  );
  if (rows.length === 0) {
    throw new Error(`No data encryption key found for workspace ${workspaceId}`);
  }
  const { wrapped_dek, master_key_version } = rows[0];
  return openEnvelope(wrapped_dek, keyProvider.getMasterKey(master_key_version), workspaceId);
}

/**
 * The only sanctioned way to encrypt a secret value (ADR 0004 #5). Binds workspaceId and
 * secretId as authenticated additional data, so a ciphertext copied to another row or
 * workspace fails to decrypt (ADR 0004 #4).
 */
export async function encrypt(
  prisma: PrismaClient,
  workspaceId: string,
  secretId: string,
  plaintext: string,
  keyProvider: KeyProvider = getDefaultKeyProvider(),
): Promise<string> {
  const dek = await getWorkspaceDek(prisma, workspaceId, keyProvider);
  return sealEnvelope(dek, `${workspaceId}:${secretId}`, Buffer.from(plaintext, 'utf8'));
}

export async function decrypt(
  prisma: PrismaClient,
  workspaceId: string,
  secretId: string,
  ciphertext: string,
  keyProvider: KeyProvider = getDefaultKeyProvider(),
): Promise<string> {
  const dek = await getWorkspaceDek(prisma, workspaceId, keyProvider);
  return openEnvelope(ciphertext, dek, `${workspaceId}:${secretId}`).toString('utf8');
}
