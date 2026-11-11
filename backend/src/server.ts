import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadDotenv } from 'dotenv'
import { buildApp } from './app.js'
import { loadEnv } from './config/env.js'

// The .env lives at the repository root, two levels above src/
loadDotenv({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env'), quiet: true })

let env: ReturnType<typeof loadEnv>
try {
  env = loadEnv(process.env)
} catch (error) {
  // No logger exists yet; the message names variables only, never their values.
  process.stderr.write(`${(error as Error).message}\n`)
  process.exit(1)
}

const app = await buildApp({ env })

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    app.log.info({ signal }, 'shutting down')
    app.close().then(
      () => process.exit(0),
      (err) => {
        app.log.error({ err }, 'error during shutdown')
        process.exit(1)
      },
    )
  })
}

try {
  await app.listen({ port: env.PORT, host: env.HOST })
} catch (err) {
  app.log.error({ err }, 'failed to start')
  process.exit(1)
}
