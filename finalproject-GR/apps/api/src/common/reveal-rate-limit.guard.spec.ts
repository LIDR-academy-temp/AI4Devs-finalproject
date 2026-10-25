import { ExecutionContext, HttpException } from '@nestjs/common';
import { RevealRateLimitGuard } from './reveal-rate-limit.guard';
import type { AuthenticatedRequest } from './clerk-auth.guard';

function makeContext(userId: string): ExecutionContext {
  const request: Partial<AuthenticatedRequest> = { auth: { clerkUserId: 'c1', userId, workspaceId: 'w1', projectId: 'p1' } };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('RevealRateLimitGuard', () => {
  let nowSpy: jest.SpyInstance;
  let currentTime: number;

  beforeEach(() => {
    currentTime = 1_000_000;
    nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => currentTime);
  });

  afterEach(() => {
    nowSpy.mockRestore();
  });

  it('allows up to 10 calls within a window, then throws 429 on the 11th', () => {
    const guard = new RevealRateLimitGuard();
    const context = makeContext('user-rate-1');

    for (let i = 0; i < 10; i += 1) {
      expect(guard.canActivate(context)).toBe(true);
    }

    expect(() => guard.canActivate(context)).toThrow(HttpException);
    try {
      guard.canActivate(context);
    } catch (error) {
      expect((error as HttpException).getStatus()).toBe(429);
    }
  });

  it('allows a new call once the window has elapsed', () => {
    const guard = new RevealRateLimitGuard();
    const context = makeContext('user-rate-2');

    for (let i = 0; i < 10; i += 1) {
      guard.canActivate(context);
    }
    expect(() => guard.canActivate(context)).toThrow(HttpException);

    currentTime += 60_001;

    expect(guard.canActivate(context)).toBe(true);
  });

  it('tracks separate users independently', () => {
    const guard = new RevealRateLimitGuard();
    const contextA = makeContext('user-rate-a');
    const contextB = makeContext('user-rate-b');

    for (let i = 0; i < 10; i += 1) {
      guard.canActivate(contextA);
    }
    expect(() => guard.canActivate(contextA)).toThrow(HttpException);

    expect(guard.canActivate(contextB)).toBe(true);
  });
});
