import { validateEnv } from './env.schema.js';

const base = {
  DATABASE_URL: 'postgresql://concilia:concilia@localhost:5432/concilia',
  JWT_SECRET: 'un-secreto-suficientemente-largo',
};

describe('validateEnv', () => {
  it('aplica los valores por defecto', () => {
    const env = validateEnv(base);
    expect(env.PORT).toBe(3000);
    expect(env.CORS_ORIGIN).toBe('http://localhost:5173');
    expect(env.JWT_EXPIRES_IN).toBe('8h');
    expect(env.NODE_ENV).toBe('development');
  });

  it('convierte PORT a número', () => {
    expect(validateEnv({ ...base, PORT: '3001' }).PORT).toBe(3001);
  });

  it('nombra la variable ausente cuando falta DATABASE_URL', () => {
    const { DATABASE_URL: _omitida, ...sinDb } = base;
    expect(() => validateEnv(sinDb)).toThrow(/DATABASE_URL es obligatoria/);
  });

  it('nombra la variable ausente cuando falta JWT_SECRET', () => {
    const { JWT_SECRET: _omitida, ...sinJwt } = base;
    expect(() => validateEnv(sinJwt)).toThrow(/JWT_SECRET es obligatoria/);
  });

  it('rechaza un JWT_SECRET demasiado corto', () => {
    expect(() => validateEnv({ ...base, JWT_SECRET: 'corto' })).toThrow(/JWT_SECRET/);
  });

  it('rechaza una DATABASE_URL que no es URL', () => {
    expect(() => validateEnv({ ...base, DATABASE_URL: 'no-es-url' })).toThrow(/DATABASE_URL/);
  });
});
