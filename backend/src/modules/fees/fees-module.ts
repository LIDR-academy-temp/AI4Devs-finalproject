import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { FeeReadService } from './application/fee-read-service.js'
import { feeRoutes } from './http/fee-routes.js'
import { PrismaFeeRepository } from './infrastructure/prisma-fee-repository.js'

export interface FeesModuleOptions {
  /** Where the fee routes are mounted, e.g. /api/v1. */
  routePrefix: string
  /** Injected service (tests); otherwise wired to the Prisma fee repository. */
  service?: FeeReadService
}

/** Composition root of the fees module (read side): repository, service and routes. */
export const feesModule = fp(
  async (app: FastifyInstance, options: FeesModuleOptions) => {
    const service = options.service ?? new FeeReadService(new PrismaFeeRepository(app.prisma))
    await app.register(feeRoutes, { prefix: options.routePrefix, service })
  },
  { name: 'fees-module', dependencies: ['prisma', 'auth'] },
)
