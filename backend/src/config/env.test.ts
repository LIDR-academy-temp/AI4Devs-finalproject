import { describe, expect, it } from 'vitest'
import { loadEnv } from './env.js'

const VALID_SECRET = 'test-only-secret-with-at-least-32-chars'

const BASE_ENV = {
  DB_HOST: 'localhost',
  DB_PORT: '1433',
  DB_NAME: 'ReconTool',
  DB_USER: 'recon_app',
  RECON_APP_PASSWORD: 'local-test-password',
}

function errorOf(fn: () => unknown): Error {
  try {
    fn()
  } catch (e) {
    return e as Error
  }
  throw new Error('expected loadEnv to throw')
}

describe('loadEnv', () => {
  it('fails naming JWT_SECRET when it is missing', () => {
    const error = errorOf(() => loadEnv({ ...BASE_ENV }))

    expect(error.message).toContain('JWT_SECRET')
  })

  it('fails naming JWT_SECRET without echoing its value when it is shorter than 32 characters', () => {
    const shortSecret = 'short-secret-31-characters-long'
    expect(shortSecret).toHaveLength(31)

    const error = errorOf(() => loadEnv({ ...BASE_ENV, JWT_SECRET: shortSecret }))

    expect(error.message).toContain('JWT_SECRET')
    expect(error.message).not.toContain(shortSecret)
    expect(JSON.stringify(error)).not.toContain(shortSecret)
  })

  it('accepts a secret of exactly 32 characters', () => {
    const secret = 'x'.repeat(32)

    expect(loadEnv({ ...BASE_ENV, JWT_SECRET: secret }).JWT_SECRET).toBe(secret)
  })

  it('applies the defaults for PORT, HOST and LOG_LEVEL', () => {
    const env = loadEnv({ ...BASE_ENV, JWT_SECRET: VALID_SECRET })

    expect(env.PORT).toBe(3000)
    expect(env.HOST).toBe('0.0.0.0')
    expect(env.LOG_LEVEL).toBe('info')
  })

  it('honours explicit PORT, HOST and LOG_LEVEL', () => {
    const env = loadEnv({ ...BASE_ENV, JWT_SECRET: VALID_SECRET, PORT: '4000', HOST: '127.0.0.1', LOG_LEVEL: 'warn' })

    expect(env.PORT).toBe(4000)
    expect(env.HOST).toBe('127.0.0.1')
    expect(env.LOG_LEVEL).toBe('warn')
  })
})
