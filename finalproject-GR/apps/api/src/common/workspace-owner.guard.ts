import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from './prisma.service';
import { resolveProjectWorkspaceIncludingTrash, resolveWorkspaceRole } from './workspace-role';
import type { AuthenticatedRequest } from './clerk-auth.guard';

export const REQUIRE_WORKSPACE_OWNER_KEY = 'requireWorkspaceOwner';

/** Gates a route behind the Owner workspace role. Pair with @UseGuards(WorkspaceOwnerGuard). */
export const RequireWorkspaceOwner = () => SetMetadata(REQUIRE_WORKSPACE_OWNER_KEY, true);

/**
 * Owner is a workspace role, kept apart from the project role rank (ADR 0002's two
 * levels). The target workspace is the `:projectId` route's project — found even in the
 * trash, so restore works — or else the caller's active workspace. The guard stores it
 * as `auth.ownedWorkspaceId` for the handler.
 */
@Injectable()
export class WorkspaceOwnerGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<boolean>(REQUIRE_WORKSPACE_OWNER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const auth = request.auth!;
    const projectId = request.params?.projectId;
    const workspaceId = projectId
      ? await resolveProjectWorkspaceIncludingTrash(this.prisma, auth.userId, String(projectId))
      : auth.workspaceId;

    const role = workspaceId ? await resolveWorkspaceRole(this.prisma, auth.userId, workspaceId) : null;
    if (role !== 'Owner') {
      throw new ForbiddenException('Only the workspace Owner can do this');
    }

    auth.ownedWorkspaceId = workspaceId!;
    return true;
  }
}
