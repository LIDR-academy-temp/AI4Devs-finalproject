import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { FeeAdminService } from './application/fee-admin-service.js'
import { FeeQueryService } from './application/fee-query-service.js'
import { FeeReadService } from './application/fee-read-service.js'
import { feeAdminRoutes } from './http/fee-admin-routes.js'
import { feeRoutes } from './http/fee-routes.js'
import { PrismaFeeAdminRepository } from './infrastructure/prisma-fee-admin-repository.js'
import { PrismaFeeQueryRepository } from './infrastructure/prisma-fee-query-repository.js'
import { PrismaFeeRepository } from './infrastructure/prisma-fee-repository.js'

export interface FeesModuleOptions {
  /** Where the fee routes are mounted, e.g. /api/v1. */
  routePrefix: string
  /** Injected services (tests); otherwise wired to the Prisma repositories. */
  service?: FeeReadService
  adminService?: FeeAdminService
  queryService?: FeeQueryService
}

/** Composition root of the fees module: read side and administration (admin-fees). */
export const feesModule = fp(
  async (app: FastifyInstance, options: FeesModuleOptions) => {
    const service = options.service ?? new FeeReadService(new PrismaFeeRepository(app.prisma))
    const admin = options.adminService ?? new FeeAdminService(new PrismaFeeAdminRepository(app.prisma, app.log))
    await app.register(feeRoutes, { prefix: options.routePrefix, service })
    const query = options.queryService ?? new FeeQueryService(new PrismaFeeQueryRepository(app.prisma))
    await app.register(feeAdminRoutes, { prefix: options.routePrefix, admin, query })
  },
  { name: 'fees-module', dependencies: ['prisma', 'auth'] },
)
