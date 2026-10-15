import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import Fastify, { type FastifyInstance } from 'fastify'
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import type { Env } from './config/env.js'
import type { PrismaClient } from './generated/prisma/client.js'
import { errorHandlerPlugin } from './plugins/error-handler.js'
import { prismaPlugin } from './plugins/prisma.js'
import { healthRoutes } from './routes/health.js'

export const API_PREFIX = '/api/v1'

export interface BuildAppOptions {
  env: Env
  /** Injected Prisma client (tests); otherwise one is created from env and closed with the app. */
  prisma?: PrismaClient
  /** Log destination (tests capture logs through it); defaults to stdout. */
  logStream?: { write(line: string): void }
}

/** Builds the Fastify application without listening (README §4 conventions). */
export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const { env } = options
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      redact: {
        paths: ['req.headers.authorization', '*.password', '*.accessToken', '*.refreshToken', '*.passwordHash'],
        censor: '[redacted]',
      },
      ...(options.logStream ? { stream: options.logStream } : {}),
    },
  }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  await app.register(errorHandlerPlugin)
  await app.register(prismaPlugin, { env, client: options.prisma })

  await app.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: { title: 'Recon Tool API', version: '0.1.0' },
      components: {
        securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
      },
    },
    transform: jsonSchemaTransform,
  })
  await app.register(swaggerUi, { routePrefix: '/docs' })

  await app.register(healthRoutes, { prefix: API_PREFIX })

  return app
}
