import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { verifyToken } from '@clerk/backend';
import { ClerkAuthGuard, AuthenticatedRequest } from './clerk-auth.guard';
import { clerkClient } from './clerk-client';
import { provisionIdentity } from './provision-identity';

jest.mock('@clerk/backend', () => ({
  verifyToken: jest.fn(),
  createClerkClient: jest.fn(() => ({ users: { getUser: jest.fn() } })),
}));
jest.mock('./clerk-client', () => ({
  clerkClient: { users: { getUser: jest.fn() } },
}));
jest.mock('./provision-identity', () => ({
  provisionIdentity: jest.fn(),
}));

const mockedVerifyToken = verifyToken as jest.Mock;
const mockedGetUser = clerkClient.users.getUser as jest.Mock;
const mockedProvisionIdentity = provisionIdentity as jest.Mock;

function makeContext(headers: Record<string, string>, isPublic = false): ExecutionContext {
  const request: Partial<AuthenticatedRequest> = { headers: headers as never };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => (isPublic ? { __public: true } : {}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('ClerkAuthGuard', () => {
  let reflector: Reflector;

  beforeEach(() => {
    mockedVerifyToken.mockReset();
    mockedGetUser.mockReset();
    mockedProvisionIdentity.mockReset();
    reflector = new Reflector();
  });

  it('resolves clerkUserId, userId, and workspaceId for a valid token', async () => {
    mockedVerifyToken.mockResolvedValue({ sub: 'clerk-user-1' });
    mockedGetUser.mockResolvedValue({
      emailAddresses: [{ emailAddress: 'ada@example.com' }],
      firstName: 'Ada',
      lastName: 'Lovelace',
    });
    mockedProvisionIdentity.mockResolvedValue({
      userId: 'user-1',
      workspaceId: 'workspace-1',
      projectId: 'project-1',
      created: false,
    });

    const guard = new ClerkAuthGuard(reflector, {} as never);
    const request: Partial<AuthenticatedRequest> = { headers: { authorization: 'Bearer good-token' } as never };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.auth).toEqual({
      clerkUserId: 'clerk-user-1',
      userId: 'user-1',
      workspaceId: 'workspace-1',
      projectId: 'project-1',
      emailVerified: undefined,
    });
    expect(mockedProvisionIdentity).toHaveBeenCalledWith(expect.anything(), 'clerk-user-1', 'ada@example.com', 'Ada Lovelace');
  });

  it('rejects with 401 when no Authorization header is present', async () => {
    const guard = new ClerkAuthGuard(reflector, {} as never);
    await expect(guard.canActivate(makeContext({}))).rejects.toBeInstanceOf(UnauthorizedException);
    expect(mockedVerifyToken).not.toHaveBeenCalled();
  });

  it('rejects with 401 when verifyToken rejects (invalid or expired token)', async () => {
    mockedVerifyToken.mockRejectedValue(new Error('token expired'));
    const guard = new ClerkAuthGuard(reflector, {} as never);
    const context = makeContext({ authorization: 'Bearer bad-token' });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(mockedProvisionIdentity).not.toHaveBeenCalled();
  });

  it('bypasses verification for a route marked @Public()', async () => {
    const guard = new ClerkAuthGuard(reflector, {} as never);
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const result = await guard.canActivate(makeContext({}, true));
    expect(result).toBe(true);
    expect(mockedVerifyToken).not.toHaveBeenCalled();
  });
});
