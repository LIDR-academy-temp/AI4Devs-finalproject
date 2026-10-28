import { EnvKeyProvider } from './key-provider';

describe('EnvKeyProvider', () => {
  const ORIGINAL_ENV = process.env.SECRETS_MASTER_KEY;

  afterEach(() => {
    process.env.SECRETS_MASTER_KEY = ORIGINAL_ENV;
  });

  it('throws immediately at construction when SECRETS_MASTER_KEY is missing, not on first use', () => {
    delete process.env.SECRETS_MASTER_KEY;
    expect(() => new EnvKeyProvider()).toThrow('SECRETS_MASTER_KEY must be set');
  });

  it('throws immediately at construction when SECRETS_MASTER_KEY decodes to the wrong length', () => {
    process.env.SECRETS_MASTER_KEY = Buffer.from('too-short').toString('base64');
    expect(() => new EnvKeyProvider()).toThrow(/must decode to 32 bytes/);
  });

  it('returns the decoded 32-byte key for version 1', () => {
    const key = Buffer.alloc(32, 7);
    process.env.SECRETS_MASTER_KEY = key.toString('base64');

    const provider = new EnvKeyProvider();

    expect(provider.getMasterKey(1)).toEqual(key);
  });

  it('throws for any version other than 1', () => {
    process.env.SECRETS_MASTER_KEY = Buffer.alloc(32, 7).toString('base64');
    const provider = new EnvKeyProvider();

    expect(() => provider.getMasterKey(2)).toThrow('Unknown master key version: 2');
  });
});
