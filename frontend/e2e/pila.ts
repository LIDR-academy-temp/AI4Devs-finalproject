import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

const PUERTO = '8088'
const RAIZ = resolve(import.meta.dirname, '../..')

export const URL_E2E = `http://localhost:${PUERTO}`
export const EMAIL_E2E = 'e2e@weathertrack.example'

/**
 * Siempre sobre el proyecto `wt-e2e`, con su propia base: `cierre-global` la borra, y así
 * nunca toca el proyecto por defecto, que guarda los datos reales. Las variables del proceso
 * ganan sobre las del archivo, y `--env-file` evita que Compose lea el `.env` real.
 */
export function compose(...argumentos: string[]): string {
  return execFileSync(
    'docker',
    ['compose', '-p', 'wt-e2e', '--env-file', '.env.example', ...argumentos],
    {
      cwd: RAIZ,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        SAT2_MODO: 'escenarios',
        PUERTO_WEB: PUERTO,
        CARGA_PAUSA_SEGUNDOS: '0',
        COOKIE_SEGURA: 'false',
      },
    },
  )
}
