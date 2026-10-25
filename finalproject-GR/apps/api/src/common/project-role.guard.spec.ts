import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ProjectRoleGuard } from './project-role.guard';
import { resolveEffectiveProjectRole } from './project-role';
import type { AuthenticatedRequest } from './clerk-auth.guard';

jest.mock('./project-role', () => {
  const actual = jest.requireActual('./project-role');
  return { ...actual, resolveEffectiveProjectRole: jest.fn() };
});

const mockedResolve = resolveEffectiveProjectRole as jest.Mock;

function makeContext(request: Partial<AuthenticatedRequest>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

function makeRequest(): Partial<AuthenticatedRequest> {
  return {
    params: { projectId: 'project-1' } as never,
    auth: { clerkUserId: 'c1', userId: 'user-1', workspaceId: 'workspace-1', projectId: 'project-1' },
  };
}

describe('ProjectRoleGuard', () => {
  let reflector: Reflector;

  beforeEach(() => {
    mockedResolve.mockReset();
    reflector = new Reflector();
  });

  it('proceeds when the resolved role meets the minimum', async () => {
    mockedResolve.mockResolvedValue('Contributor');
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('Viewer');
    const guard = new ProjectRoleGuard(reflector, {} as never);
    const request = makeRequest();

    const result = await guard.canActivate(makeContext(request));

    expect(result).toBe(true);
    expect(request.auth?.projectRole).toBe('Contributor');
  });

  it('throws 403 when the resolved role is below the minimum', async () => {
    mockedResolve.mockResolvedValue('Viewer');
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('Admin');
    const guard = new ProjectRoleGuard(reflector, {} as never);

    await expect(guard.canActivate(makeContext(makeRequest()))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws 403 when the resolved role is null (no access)', async () => {
    mockedResolve.mockResolvedValue(null);
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('Viewer');
    const guard = new ProjectRoleGuard(reflector, {} as never);

    await expect(guard.canActivate(makeContext(makeRequest()))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('skips the check entirely when no minimum role is declared', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const guard = new ProjectRoleGuard(reflector, {} as never);

    const result = await guard.canActivate(makeContext(makeRequest()));

    expect(result).toBe(true);
    expect(mockedResolve).not.toHaveBeenCalled();
  });
});
