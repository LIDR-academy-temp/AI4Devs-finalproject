/**
 * Seed idempotente: crea la empresa demo y dos usuarios (ADMIN y ANALYST).
 * Ejecutar con `npm run db:seed` (prisma db seed). Repetirlo no duplica registros.
 *
 * Credenciales de desarrollo (configurables por variables de entorno):
 *   admin@demo.concilia.app    / SEED_ADMIN_PASSWORD   (por defecto: Concilia2026!)
 *   analista@demo.concilia.app / SEED_ANALYST_PASSWORD (por defecto: Concilia2026!)
 */
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { DEMO_COMPANY, DEMO_USERS, runSeed } from './seed-data.js';

loadEnv({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Falta DATABASE_URL para ejecutar el seed');
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
try {
  await runSeed(prisma);
  console.log(`Seed completado: empresa "${DEMO_COMPANY.name}" y ${DEMO_USERS.length} usuarios.`);
  for (const user of DEMO_USERS) {
    const fuente = process.env[user.passwordEnv] ? user.passwordEnv : 'contraseña por defecto';
    console.log(`  - ${user.role.padEnd(7)} ${user.email} (${fuente})`);
  }
} catch (error) {
  console.error('Error ejecutando el seed:', error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
