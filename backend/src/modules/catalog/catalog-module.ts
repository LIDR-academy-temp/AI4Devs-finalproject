import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { CatalogService } from './application/catalog-service.js'
import { catalogRoutes } from './http/catalog-routes.js'
import { PrismaCatalogRepository } from './infrastructure/prisma-catalog-repository.js'

export interface CatalogModuleOptions {
  /** Where the catalog routes are mounted, e.g. /api/v1. */
  routePrefix: string
  /** Injected service (tests); otherwise wired to the Prisma catalog repository. */
  service?: CatalogService
}

/** Composition root of the catalog module: repository, service and read-only routes. */
export const catalogModule = fp(
  async (app: FastifyInstance, options: CatalogModuleOptions) => {
    const service = options.service ?? new CatalogService(new PrismaCatalogRepository(app.prisma))
    await app.register(catalogRoutes, { prefix: options.routePrefix, service })
  },
  { name: 'catalog-module', dependencies: ['prisma', 'auth'] },
)
