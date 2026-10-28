import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { HealthController } from './health/health.controller';
import { MeController } from './me/me.controller';
import { ProjectsController } from './projects/projects.controller';
import { TestCasesController } from './test-cases/test-cases.controller';
import { EnvironmentsController } from './environments/environments.controller';
import { ExecutionsController } from './executions/executions.controller';
import { ExecutionLifecycleController } from './executions/execution-lifecycle.controller';
import { BugsController } from './bugs/bugs.controller';
import { FoldersController } from './folders/folders.controller';
import { TagsController } from './tags/tags.controller';
import { WorkspaceController } from './workspace/workspace.controller';
import { ClerkAuthGuard } from './common/clerk-auth.guard';
import { ProjectRoleGuard } from './common/project-role.guard';
import { WorkspaceOwnerGuard } from './common/workspace-owner.guard';
import { RevealRateLimitGuard } from './common/reveal-rate-limit.guard';
import { PrismaService } from './common/prisma.service';

@Module({
  controllers: [
    HealthController,
    MeController,
    ProjectsController,
    TestCasesController,
    EnvironmentsController,
    ExecutionsController,
    ExecutionLifecycleController,
    BugsController,
    FoldersController,
    TagsController,
    WorkspaceController,
  ],
  providers: [
    PrismaService,
    ProjectRoleGuard,
    WorkspaceOwnerGuard,
    RevealRateLimitGuard,
    { provide: APP_GUARD, useClass: ClerkAuthGuard },
  ],
})
export class AppModule {}
