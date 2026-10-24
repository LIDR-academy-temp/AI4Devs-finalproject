/**
 * Datos y lógica del seed (reutilizados por los tests de integración).
 * Idempotente: upsert por taxId y por email.
 */
import * as bcrypt from 'bcrypt';
import { PrismaClient, Role } from '../src/generated/prisma/client.js';

export const BCRYPT_COST = 12;

export const DEMO_COMPANY = {
  name: 'Comercial Demo S.A.',
  taxId: '0999999999001',
};

export const DEMO_USERS = [
  {
    name: 'Administrador Demo',
    email: 'admin@demo.concilia.app',
    role: Role.ADMIN,
    passwordEnv: 'SEED_ADMIN_PASSWORD',
  },
  {
    name: 'Analista Demo',
    email: 'analista@demo.concilia.app',
    role: Role.ANALYST,
    passwordEnv: 'SEED_ANALYST_PASSWORD',
  },
] as const;

export const DEFAULT_PASSWORD = 'Concilia2026!';

export async function runSeed(prisma: PrismaClient): Promise<void> {
  const company = await prisma.company.upsert({
    where: { taxId: DEMO_COMPANY.taxId },
    update: { name: DEMO_COMPANY.name },
    create: DEMO_COMPANY,
  });

  for (const user of DEMO_USERS) {
    const password = process.env[user.passwordEnv] ?? DEFAULT_PASSWORD;
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, active: true, companyId: company.id },
      create: {
        name: user.name,
        email: user.email,
        role: user.role,
        passwordHash,
        companyId: company.id,
      },
    });
  }
}
