import { withUserContext } from './user-context';

describe('withUserContext', () => {
  it('sets app.user_id before running the callback, inside one transaction', async () => {
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

    const result = await withUserContext(fakePrisma as never, 'user-123', async (tx) => {
      callOrder.push('fn');
      expect(tx).toBe(fakeTx);
      return 'done';
    });

    expect(result).toBe('done');
    expect(fakePrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(fakeTx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(fakeTx.$executeRaw.mock.calls[0][1]).toBe('user-123');
    expect(callOrder).toEqual(['set_config', 'fn']);
  });
});
