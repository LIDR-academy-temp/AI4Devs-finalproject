import type { PrismaMssql } from '@prisma/adapter-mssql'
import type { Env } from '../config/env.js'

export type MssqlConfig = Exclude<ConstructorParameters<typeof PrismaMssql>[0], string>

/** SQL Server connection for the Prisma adapter; same variables and options as prisma/seed.ts. */
export function mssqlConfigFromEnv(
  env: Pick<Env, 'DB_HOST' | 'DB_PORT' | 'DB_NAME' | 'DB_USER' | 'RECON_APP_PASSWORD'>,
): MssqlConfig {
  return {
    server: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.RECON_APP_PASSWORD,
    options: { encrypt: true, trustServerCertificate: true },
  }
}
