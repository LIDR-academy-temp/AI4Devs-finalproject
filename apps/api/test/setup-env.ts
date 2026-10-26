// Los tests de integración usan la base de datos de test, nunca la de desarrollo.
// DATABASE_URL_TEST la define .env (ver .env.example) o el entorno de CI.
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });

const testUrl = process.env.DATABASE_URL_TEST;
if (!testUrl) {
  throw new Error(
    'Falta DATABASE_URL_TEST: los tests de integración necesitan una base de datos de test separada',
  );
}
process.env.DATABASE_URL = testUrl;
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'secreto-de-test-con-mas-de-16-caracteres';
process.env.NODE_ENV = 'test';
// Los tests hacen muchos logins desde la misma IP: el límite real se verifica en auth.int-spec
process.env.LOGIN_RATE_LIMIT = process.env.LOGIN_RATE_LIMIT ?? '1000';
