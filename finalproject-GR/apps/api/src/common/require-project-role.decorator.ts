import { SetMetadata } from '@nestjs/common';
import type { ProjectRole } from './project-role';

export const REQUIRE_PROJECT_ROLE_KEY = 'requireProjectRole';

/** Gates a route behind a minimum effective project role. Pair with @UseGuards(ProjectRoleGuard). */
export const RequireProjectRole = (minimumRole: ProjectRole) => SetMetadata(REQUIRE_PROJECT_ROLE_KEY, minimumRole);
