import { z } from 'zod'

const LogLevel = z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])

// DB_* defaults match prisma.config.ts and prisma/seed.ts.
const EnvSchema = z.object({
  JWT_SECRET: z.string().min(32, 'must be at least 32 characters'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  HOST: z.string().min(1).default('0.0.0.0'),
  LOG_LEVEL: LogLevel.default('info'),
  DB_HOST: z.string().min(1).default('localhost'),
  DB_PORT: z.coerce.number().int().min(1).max(65_535).default(1433),
  DB_NAME: z.string().min(1).default('ReconTool'),
  DB_USER: z.string().min(1).default('recon_app'),
  RECON_APP_PASSWORD: z.string().default(''),
  /** Root of the uploaded settlement files; a relative path resolves against the backend process cwd. */
  UPLOAD_DIR: z.string().min(1).default('./data/uploads'),
})

export type Env = z.infer<typeof EnvSchema>

/**
 * Validates the process environment. On failure the error lists the offending variable
 * names and the rule they broke, never their values (they may be secrets).
 */
export function loadEnv(source: Record<string, string | undefined>): Env {
  const result = EnvSchema.safeParse(source)
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    throw new Error(`Invalid environment variables: ${problems.join('; ')}`)
  }
  return result.data
}
