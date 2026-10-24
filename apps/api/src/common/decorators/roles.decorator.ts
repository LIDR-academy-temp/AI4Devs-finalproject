import { SetMetadata } from '@nestjs/common';
import type { Role } from '../../generated/prisma/client.js';

export const ROLES_KEY = 'roles';

/** Restringe una ruta a los roles indicados (p. ej. `@Roles('ADMIN')`). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
