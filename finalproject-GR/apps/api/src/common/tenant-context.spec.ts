import { withTenantContext } from './tenant-context';

describe('withTenantContext', () => {
  it('sets the workspace context before running the callback, inside one transaction', async () => {
    const callOrder: string[] = [];

    const fakeTx = {
      $executeRaw: jest.fn(async (..._args: unknown[]) => {
        callOrder.push('set_config');
        return undefined;
      }),
    };

    const fakePrisma = {
      $transaction: jest.fn(async (cb: (tx: typeof fakeTx) => Promise<unknown>) => cb(fakeTx)),
    };

    const result = await withTenantContext(fakePrisma as never, 'workspace-123', async (tx) => {
      callOrder.push('fn');
      expect(tx).toBe(fakeTx);
      return 'done';
    });

    expect(result).toBe('done');
    expect(fakePrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(fakeTx.$executeRaw).toHaveBeenCalledTimes(1);
    // the interpolated value in the tagged-template call is the workspace id
    expect(fakeTx.$executeRaw.mock.calls[0][1]).toBe('workspace-123');
    expect(callOrder).toEqual(['set_config', 'fn']);
  });
});
