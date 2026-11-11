import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { CatalogService } from '../catalog/application/catalog-service.js'
import { PrismaCatalogRepository } from '../catalog/infrastructure/prisma-catalog-repository.js'
import { AccountAdminService } from './application/account-admin-service.js'
import { accountAdminRoutes } from './http/account-admin-routes.js'
import { PrismaAccountAdminRepository } from './infrastructure/prisma-account-admin-repository.js'

export interface AccountsModuleOptions {
  /** Where the account administration routes are mounted, e.g. /api/v1. */
  routePrefix: string
  /** Injected service (tests); otherwise wired to the Prisma repository. */
  adminService?: AccountAdminService
  /** The catalog that answers the account detail; otherwise one over Prisma. */
  catalogService?: CatalogService
}

/**
 * Composition root of the account administration (admin-accounts design D1). The account reads stay in the
 * catalog module; this one owns the writes and answers with the catalog's account detail.
 */
export const accountsModule = fp(
  async (app: FastifyInstance, options: AccountsModuleOptions) => {
    const catalog = options.catalogService ?? new CatalogService(new PrismaCatalogRepository(app.prisma))
    const admin =
      options.adminService ?? new AccountAdminService(new PrismaAccountAdminRepository(app.prisma, app.log), catalog)
    await app.register(accountAdminRoutes, { prefix: options.routePrefix, admin })
  },
  { name: 'accounts-module', dependencies: ['prisma', 'auth'] },
)
