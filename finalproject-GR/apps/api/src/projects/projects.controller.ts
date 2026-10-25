import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ProjectRoleGuard } from '../common/project-role.guard';
import { RequireProjectRole } from '../common/require-project-role.decorator';
import type { ProjectRole } from '../common/project-role';
import { PrismaService } from '../common/prisma.service';
import { withUserContext } from '../common/user-context';
import type { AuthenticatedRequest } from '../common/clerk-auth.guard';

interface ProjectRow {
  id: string;
  name: string;
  slug: string;
}

interface ProjectResponse extends ProjectRow {
  role: ProjectRole;
}

@Controller('projects')
export class ProjectsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':projectId')
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('Viewer')
  async getProject(
    @Param('projectId') projectId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ProjectResponse> {
    // ProjectRoleGuard already proved the caller has at least Viewer access, which
    // requires them to be a member of the project's workspace — so the same
    // member_visible-backed lookup, under the caller's own user context, finds the row.
    const rows = await withUserContext(this.prisma, request.auth!.userId, (tx) =>
      tx.$queryRaw<ProjectRow[]>`SELECT id, name, slug FROM project WHERE id = ${projectId}::uuid`,
    );
    // ProjectRoleGuard already resolved and stored the caller's effective role
    // (frontend-bootstrap) — surfaced here so a client can gate its own UI without a
    // second request.
    return { ...rows[0], role: request.auth!.projectRole! };
  }
}
