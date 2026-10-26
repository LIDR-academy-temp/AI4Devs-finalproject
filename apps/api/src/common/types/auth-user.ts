import type { Role } from '../../generated/prisma/client.js';

/** Usuario autenticado tal y como lo expone el token JWT. La empresa sale siempre de aquí. */
export interface AuthUser {
  userId: string;
  companyId: string;
  role: Role;
}

/** Contenido (claims) del JWT emitido en el login. */
export interface JwtPayload {
  sub: string;
  companyId: string;
  role: Role;
}
