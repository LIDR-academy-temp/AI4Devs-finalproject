import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

const HealthResponse = z.object({
  status: z.enum(['ok', 'degraded']),
  db: z.enum(['ok', 'error']),
})

export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/health',
    {
      schema: {
        tags: ['system'],
        summary: 'Service and database health',
        response: { 200: HealthResponse, 503: HealthResponse },
      },
    },
    async (request, reply) => {
      try {
        await app.prisma.$queryRaw`SELECT 1`
        return { status: 'ok' as const, db: 'ok' as const }
      } catch (err) {
        request.log.warn({ err }, 'health check: database unreachable')
        return reply.status(503).send({ status: 'degraded', db: 'error' })
      }
    },
  )
}
