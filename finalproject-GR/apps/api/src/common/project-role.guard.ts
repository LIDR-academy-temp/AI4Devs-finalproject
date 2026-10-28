import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PROJECT_ROLE_KEY } from './require-project-role.decorator';
import { ROLE_RANK, ProjectRole, resolveEffectiveProjectRole } from './project-role';
import { PrismaService } from './prisma.service';
import type { AuthenticatedRequest } from './clerk-auth.guard';

/**
 * Applied per-route (not global like ClerkAuthGuard) alongside @RequireProjectRole —
 * most routes aren't project-scoped, so a global "no requirement -> allow" fallback
 * would run for no benefit (design.md).
 */
@Injectable()
export class ProjectRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const minimumRole = this.reflector.getAllAndOverride<ProjectRole>(REQUIRE_PROJECT_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!minimumRole) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const projectId = String(request.params.projectId);
    const effectiveRole = await resolveEffectiveProjectRole(this.prisma, request.auth!.userId, projectId);

    if (!effectiveRole || ROLE_RANK[effectiveRole] < ROLE_RANK[minimumRole]) {
      throw new ForbiddenException('Insufficient project role');
    }

    request.auth!.projectRole = effectiveRole;
    return true;
  }
}
