import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'
import { defineConfig } from 'prisma/config'

// The .env lives at the repository root, one level above backend/
const here = path.dirname(fileURLToPath(import.meta.url))
loadEnv({ path: path.resolve(here, '../.env') })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Single source of truth: the same DB_* variables the seed uses (see .env.example)
    url: `sqlserver://${process.env.DB_HOST ?? 'localhost'}:${process.env.DB_PORT ?? '1433'};database=${process.env.DB_NAME ?? 'ReconTool'};user=${process.env.DB_USER ?? 'recon_app'};password={${process.env.RECON_APP_PASSWORD ?? ''}};encrypt=true;trustServerCertificate=true`,
  },
})
