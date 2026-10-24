import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';

function context(role: string | undefined, required: string[] | undefined) {
  const reflector = { getAllAndOverride: () => required } as unknown as Reflector;
  const ctx = {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user: role ? { role } : undefined }) }),
  } as unknown as ExecutionContext;
  return { guard: new RolesGuard(reflector), ctx };
}

describe('RolesGuard', () => {
  it('permite cualquier rol si la ruta no declara roles', () => {
    const { guard, ctx } = context('ANALYST', undefined);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('permite ADMIN en una ruta exclusiva de ADMIN', () => {
    const { guard, ctx } = context('ADMIN', ['ADMIN']);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rechaza ANALYST en una ruta exclusiva de ADMIN', () => {
    const { guard, ctx } = context('ANALYST', ['ADMIN']);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
