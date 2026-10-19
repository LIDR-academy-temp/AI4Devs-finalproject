import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { PrismaMissingResolution } from '../validation/infrastructure/prisma-missing-resolution.js'
import { SettlementService } from './application/settlement-service.js'
import { settlementRoutes } from './http/settlement-routes.js'
import { ImportServicePrefilledFees } from './infrastructure/import-service-prefilled-fees.js'
import { PrismaSettlementReader } from './infrastructure/prisma-settlement-reader.js'
import { PrismaSettlementRepository } from './infrastructure/prisma-settlement-repository.js'
import { PrismaSettlementSource } from './infrastructure/prisma-settlement-source.js'

export interface SettlementModuleOptions {
  /** Where the settlement routes are mounted, e.g. /api/v1. */
  routePrefix: string
  /** Injected service (tests); otherwise wired to Prisma and to the import service of the imports module. */
  service?: SettlementService
}

/** Composition root of the settlement module: source, repository, reader, service and routes. */
export const settlementModule = fp(
  async (app: FastifyInstance, options: SettlementModuleOptions) => {
    const service =
      options.service ??
      new SettlementService({
        source: new PrismaSettlementSource(app.prisma),
        prefilled: new ImportServicePrefilledFees(app.importService),
        repository: new PrismaSettlementRepository(app.prisma, {
          missing: new PrismaMissingResolution(),
          log: app.log,
        }),
        reader: new PrismaSettlementReader(app.prisma),
      })
    await app.register(settlementRoutes, { prefix: options.routePrefix, service })
  },
  { name: 'settlement-module', dependencies: ['prisma', 'auth', 'imports-module'] },
)
