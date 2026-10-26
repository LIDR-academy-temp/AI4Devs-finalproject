import { z } from 'zod';

/**
 * Esquema de las variables de entorno de la API.
 * Se valida al arrancar: si falta una variable obligatoria la aplicación no inicia
 * y el mensaje de error nombra la variable ausente (spec dev-environment).
 */
const requerida = (nombre: string) => (issue: { input: unknown }) =>
  issue.input === undefined ? `${nombre} es obligatoria` : undefined;

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url({
    error: (issue) =>
      issue.input === undefined
        ? 'DATABASE_URL es obligatoria'
        : 'DATABASE_URL debe ser una URL de conexión PostgreSQL válida',
  }),
  JWT_SECRET: z
    .string({ error: requerida('JWT_SECRET') })
    .min(16, { error: 'JWT_SECRET debe tener al menos 16 caracteres' }),
  JWT_EXPIRES_IN: z.string().default('8h'),
  LOGIN_RATE_LIMIT: z.coerce.number().int().positive().default(5),
  LOGIN_RATE_TTL_MS: z.coerce.number().int().positive().default(60_000),
  STORAGE_DIR: z.string().default('./storage'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  ANTHROPIC_API_KEY: z.string().optional().default(''),
  AI_MODEL: z.string().default('claude-sonnet-5-5'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Función de validación que consume ConfigModule.forRoot({ validate }).
 * Lanza un Error con la lista de variables inválidas o ausentes.
 */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const vistos = new Set<string>();
    const detalle = result.error.issues
      .map((issue) => `${issue.path.join('.') || '(raíz)'}: ${issue.message}`)
      .filter((linea) => (vistos.has(linea) ? false : (vistos.add(linea), true)))
      .join('\n  - ');
    throw new Error(`Variables de entorno inválidas o ausentes:\n  - ${detalle}`);
  }
  return result.data;
}
