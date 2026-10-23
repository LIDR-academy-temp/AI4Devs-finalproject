// Fails before the first step when the app or the API is not up (spec "Aplicación no levantada").
const APP = 'http://localhost:5173'
const HOW =
  'Start the database, the seed and the app first: `pnpm db:up`, `pnpm db:seed` and `pnpm dev` (in another terminal).'

async function responds(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5_000) })
    return response.ok
  } catch {
    return false
  }
}

export default async function globalSetup() {
  if (!(await responds(APP))) throw new Error(`The app does not answer at ${APP}. ${HOW}`)
  if (!(await responds(`${APP}/api/v1/health`))) {
    throw new Error(`The API does not answer at ${APP}/api/v1/health. ${HOW}`)
  }
  if (!process.env.SEED_PASSWORD) {
    throw new Error('SEED_PASSWORD is not set: copy .env.example to .env at the repository root.')
  }
}
