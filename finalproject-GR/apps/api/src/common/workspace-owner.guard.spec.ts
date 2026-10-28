import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WorkspaceOwnerGuard } from './workspace-owner.guard';
import { resolveProjectWorkspaceIncludingTrash, resolveWorkspaceRole } from './workspace-role';
import type { AuthenticatedRequest } from './clerk-auth.guard';

jest.mock('./workspace-role', () => ({
  resolveWorkspaceRole: jest.fn(),
  resolveProjectWorkspaceIncludingTrash: jest.fn(),
}));

const mockedRole = resolveWorkspaceRole as jest.Mock;
const mockedProjectWorkspace = resolveProjectWorkspaceIncludingTrash as jest.Mock;

function makeContext(request: Partial<AuthenticatedRequest>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

function makeRequest(params: Record<string, string> = {}): Partial<AuthenticatedRequest> {
  return {
    params: params as never,
    auth: { clerkUserId: 'c1', userId: 'user-1', workspaceId: 'active-ws', projectId: 'project-1' },
  };
}

describe('WorkspaceOwnerGuard', () => {
  let reflector: Reflector;
  let guard: WorkspaceOwnerGuard;

  beforeEach(() => {
    mockedRole.mockReset();
    mockedProjectWorkspace.mockReset();
    reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    guard = new WorkspaceOwnerGuard(reflector, {} as never);
  });

  it("lets an Owner of the active workspace through and records it", async () => {
    mockedRole.mockResolvedValue('Owner');
    const request = makeRequest();

    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);
    expect(mockedRole).toHaveBeenCalledWith({}, 'user-1', 'active-ws');
    expect(request.auth?.ownedWorkspaceId).toBe('active-ws');
  });

  it('rejects a Collaborator with 403', async () => {
    mockedRole.mockResolvedValue('Collaborator');

    await expect(guard.canActivate(makeContext(makeRequest()))).rejects.toThrow(ForbiddenException);
  });

  it("checks the route project's workspace, found even when the project is in the trash", async () => {
    mockedProjectWorkspace.mockResolvedValue('project-ws');
    mockedRole.mockResolvedValue('Owner');
    const request = makeRequest({ projectId: 'trashed-project' });

    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);
    expect(mockedProjectWorkspace).toHaveBeenCalledWith({}, 'user-1', 'trashed-project');
    expect(mockedRole).toHaveBeenCalledWith({}, 'user-1', 'project-ws');
    expect(request.auth?.ownedWorkspaceId).toBe('project-ws');
  });

  it("rejects with 403 when the route project isn't visible to the caller", async () => {
    mockedProjectWorkspace.mockResolvedValue(null);

    await expect(guard.canActivate(makeContext(makeRequest({ projectId: 'foreign' })))).rejects.toThrow(
      ForbiddenException,
    );
    expect(mockedRole).not.toHaveBeenCalled();
  });

  it('does nothing on routes without the decorator', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    await expect(guard.canActivate(makeContext(makeRequest()))).resolves.toBe(true);
    expect(mockedRole).not.toHaveBeenCalled();
  });
});
