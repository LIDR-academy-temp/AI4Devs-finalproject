import { Body, Controller, ForbiddenException, Get, HttpCode, Put, Req } from '@nestjs/common';
import { clerkClient } from '../common/clerk-client';
import { PrismaService } from '../common/prisma.service';
import { withTenantContext } from '../common/tenant-context';
import { withUserContext } from '../common/user-context';
import { resolveEffectiveProjectRole } from '../common/project-role';
import { resolveWorkspaceRole, type WorkspaceRole } from '../common/workspace-role';
import { isUuid } from '../executions/execution-input';
import type { AuthenticatedRequest } from '../common/clerk-auth.guard';

interface MeResponse {
  id: string;
  displayName: string;
  email: string;
  workspaceId: string;
  workspaceName: string;
  workspaceRole: WorkspaceRole | null;
  projectId: string;
}

@Controller('me')
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getMe(@Req() request: AuthenticatedRequest): Promise<MeResponse> {
    const { clerkUserId, userId, workspaceId, projectId } = request.auth!;

    // Identity is already resolved/provisioned by ClerkAuthGuard; only the display
    // fields need a fresh Clerk profile fetch here.
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? '';
    const displayName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || clerkUserId;

    const [workspace] = await withTenantContext(this.prisma, workspaceId, (tx) =>
      tx.$queryRaw<{ name: string }[]>`SELECT name FROM workspace WHERE id = ${workspaceId}::uuid`,
    );
    const workspaceRole = await resolveWorkspaceRole(this.prisma, userId, workspaceId);

    return { id: userId, displayName, email, workspaceId, workspaceName: workspace.name, workspaceRole, projectId };
  }

  /**
   * Switches the active project (ADR 0017). Only to a live project that grants the
   * caller a role; a preference, not content, so nothing is activity-logged.
   */
  @Put('active-project')
  @HttpCode(204)
  async setActiveProject(@Req() request: AuthenticatedRequest, @Body() body: { projectId?: unknown }): Promise<void> {
    const { userId } = request.auth!;
    const projectId = body?.projectId;
    if (!isUuid(projectId) || !(await resolveEffectiveProjectRole(this.prisma, userId, projectId))) {
      throw new ForbiddenException('No access to that project');
    }
    await withUserContext(this.prisma, userId, (tx) =>
      tx.$executeRaw`UPDATE "user" SET last_project_id = ${projectId}::uuid WHERE id = ${userId}::uuid`,
    );
  }
}
