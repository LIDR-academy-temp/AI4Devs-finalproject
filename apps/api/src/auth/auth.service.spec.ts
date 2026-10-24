import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { PrismaService } from '../prisma/prisma.service.js';
import { AuthService, GENERIC_AUTH_ERROR } from './auth.service.js';

const COMPANY = { id: 'company-1', name: 'Demo S.A.' };

async function userRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    companyId: COMPANY.id,
    name: 'Analista',
    email: 'analista@demo.test',
    passwordHash: await bcrypt.hash('Clave-Correcta1', 4),
    role: 'ANALYST',
    active: true,
    company: COMPANY,
    ...overrides,
  };
}

function build(row: unknown) {
  const findUnique = vi.fn().mockResolvedValue(row);
  const findFirst = vi.fn().mockResolvedValue(row);
  const prisma = { user: { findUnique, findFirst } } as unknown as PrismaService;
  const jwt = new JwtService({ secret: 'secreto-de-test-con-mas-de-16-caracteres' });
  return { service: new AuthService(prisma, jwt), jwt, findUnique, findFirst };
}

describe('AuthService', () => {
  it('emite un JWT con sub, companyId y role y devuelve el usuario sin el hash', async () => {
    const { service, jwt } = build(await userRow());
    const result = await service.login('Analista@Demo.test ', 'Clave-Correcta1');

    const payload = await jwt.verifyAsync(result.accessToken);
    expect(payload).toMatchObject({ sub: 'user-1', companyId: COMPANY.id, role: 'ANALYST' });
    expect(result.user).toEqual({
      id: 'user-1',
      name: 'Analista',
      email: 'analista@demo.test',
      role: 'ANALYST',
      company: COMPANY,
    });
    expect(JSON.stringify(result)).not.toContain('passwordHash');
  });

  it('busca el correo normalizado (minúsculas, sin espacios)', async () => {
    const { service, findUnique } = build(await userRow());
    await service.login('  ANALISTA@demo.test', 'Clave-Correcta1');
    expect(findUnique.mock.calls[0][0].where).toEqual({ email: 'analista@demo.test' });
  });

  it.each([
    ['contraseña incorrecta', () => userRow(), 'otra-clave'],
    ['usuario inactivo', () => userRow({ active: false }), 'Clave-Correcta1'],
    ['correo inexistente', async () => null, 'Clave-Correcta1'],
  ])('rechaza con el mismo error genérico: %s', async (_caso, row, password) => {
    const { service } = build(await row());
    await expect(service.login('analista@demo.test', password)).rejects.toThrow(
      new UnauthorizedException(GENERIC_AUTH_ERROR),
    );
  });

  it('me() filtra por empresa del token y no expone el hash', async () => {
    const { service, findFirst } = build(await userRow());
    const me = await service.me(COMPANY.id, 'user-1');
    expect(findFirst.mock.calls[0][0].where).toMatchObject({ id: 'user-1', companyId: COMPANY.id });
    expect(me).not.toHaveProperty('passwordHash');
    expect(me.company).toEqual(COMPANY);
  });

  it('me() rechaza si el usuario ya no existe o está inactivo', async () => {
    const { service } = build(null);
    await expect(service.me(COMPANY.id, 'user-1')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
