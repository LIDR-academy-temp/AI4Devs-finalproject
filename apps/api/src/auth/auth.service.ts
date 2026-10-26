import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { Role } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { JwtPayload } from '../common/types/auth-user.js';

export const GENERIC_AUTH_ERROR = 'Correo o contraseña incorrectos';

// Hash bcrypt (coste 12) de una cadena arbitraria: se compara contra él cuando el correo no
// existe para que el tiempo de respuesta no delate qué correos están registrados.
const DUMMY_HASH = '$2b$12$4Am1LGZftDL0nkV8mmSwz.75xfXFr9F7W1lupTIIDLVBfvNQJ8.qW';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  company: { id: string; name: string };
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {}

  async login(
    email: string,
    password: string,
  ): Promise<{ accessToken: string; user: SessionUser }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { company: { select: { id: true, name: true } } },
    });
    // Una única respuesta para correo inexistente, contraseña errónea y usuario inactivo
    const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !passwordOk || !user.active) {
      throw new UnauthorizedException(GENERIC_AUTH_ERROR);
    }
    const payload: JwtPayload = { sub: user.id, companyId: user.companyId, role: user.role };
    return {
      accessToken: await this.jwt.signAsync(payload),
      user: this.toSessionUser(user),
    };
  }

  /** Datos del usuario autenticado, siempre acotados a la empresa del token. */
  async me(companyId: string, userId: string): Promise<SessionUser> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId, active: true },
      include: { company: { select: { id: true, name: true } } },
    });
    if (!user) throw new UnauthorizedException(GENERIC_AUTH_ERROR);
    return this.toSessionUser(user);
  }

  private toSessionUser(user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    company: { id: string; name: string };
  }): SessionUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: { id: user.company.id, name: user.company.name },
    };
  }
}
