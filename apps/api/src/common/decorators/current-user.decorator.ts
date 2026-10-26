import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '../types/auth-user.js';

/**
 * Expone `{ userId, companyId, role }` tomados del token.
 *
 * Convención de aislamiento por empresa (spec auth): `companyId` se obtiene SOLO de aquí,
 * nunca del cuerpo, la query ni los parámetros de la petición. Todo servicio de negocio recibe
 * `companyId` como primer argumento y lo incluye en el `where` de Prisma; si el recurso es de
 * otra empresa se responde 404 (NotFoundException), no 403, para no revelar su existencia.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser =>
    context.switchToHttp().getRequest<Request & { user: AuthUser }>().user,
);
