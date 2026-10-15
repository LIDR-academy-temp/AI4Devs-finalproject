import Fastify, { type FastifyInstance } from 'fastify'
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from 'fastify-type-provider-zod'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  ForbiddenError,
  InvalidCredentialsError,
  InvalidTokenError,
  UnauthorizedError,
} from '../modules/auth/domain/errors.js'
import { NotFoundError } from '../modules/catalog/domain/errors.js'
import { errorHandlerPlugin } from './error-handler.js'

let app: FastifyInstance

beforeAll(async () => {
  app = Fastify({ logger: false })
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  await app.register(errorHandlerPlugin)

  const typed = app.withTypeProvider<ZodTypeProvider>()
  typed.post('/validate', { schema: { body: z.object({ name: z.string().min(1) }) } }, async () => ({ ok: true }))
  app.get('/unauthorized', async () => {
    throw new UnauthorizedError()
  })
  app.get('/forbidden', async () => {
    throw new ForbiddenError()
  })
  app.get('/invalid-credentials', async () => {
    throw new InvalidCredentialsError('unknown_user')
  })
  app.get('/invalid-token', async () => {
    throw new InvalidTokenError()
  })
  app.get('/boom', async () => {
    throw new Error('database password is hunter2')
  })
  app.get('/missing', async () => {
    throw new NotFoundError('Account')
  })
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

describe('errorHandlerPlugin', () => {
  it('maps schema validation errors to 400 validation_error with details', async () => {
    const res = await app.inject({ method: 'POST', url: '/validate', payload: { name: '' } })

    expect(res.statusCode).toBe(400)
    const body = res.json()
    expect(body.code).toBe('validation_error')
    expect(body.message).toEqual(expect.any(String))
    expect(Array.isArray(body.details)).toBe(true)
    expect(body.details.length).toBeGreaterThan(0)
  })

  it('maps UnauthorizedError to 401 unauthorized', async () => {
    const res = await app.inject({ method: 'GET', url: '/unauthorized' })

    expect(res.statusCode).toBe(401)
    expect(res.json()).toEqual({ code: 'unauthorized', message: expect.any(String) })
  })

  it('maps ForbiddenError to 403 forbidden', async () => {
    const res = await app.inject({ method: 'GET', url: '/forbidden' })

    expect(res.statusCode).toBe(403)
    expect(res.json()).toEqual({ code: 'forbidden', message: expect.any(String) })
  })

  it('maps InvalidCredentialsError to the generic 401 invalid_credentials body, without the reason', async () => {
    const res = await app.inject({ method: 'GET', url: '/invalid-credentials' })

    expect(res.statusCode).toBe(401)
    expect(res.json()).toEqual({ code: 'invalid_credentials', message: 'Invalid user name or password' })
  })

  it('maps InvalidTokenError to 401 invalid_token', async () => {
    const res = await app.inject({ method: 'GET', url: '/invalid-token' })

    expect(res.statusCode).toBe(401)
    expect(res.json()).toEqual({ code: 'invalid_token', message: expect.any(String) })
  })

  it('maps any other error to 500 internal_error without leaking message or stack', async () => {
    const res = await app.inject({ method: 'GET', url: '/boom' })

    expect(res.statusCode).toBe(500)
    expect(res.json()).toEqual({ code: 'internal_error', message: 'Internal server error' })
    expect(res.body).not.toContain('hunter2')
    expect(res.body).not.toContain('at ')
  })

  it('maps NotFoundError to 404 not_found naming the resource type only', async () => {
    const res = await app.inject({ method: 'GET', url: '/missing' })

    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ code: 'not_found', message: 'Account not found' })
  })

  it('answers unknown routes with 404 not_found in the uniform body', async () => {
    const res = await app.inject({ method: 'GET', url: '/nope' })

    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ code: 'not_found', message: expect.any(String) })
  })
})
