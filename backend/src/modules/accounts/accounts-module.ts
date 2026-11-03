import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { accountAdminRoutes } from './http/account-admin-routes.js'

export interface AccountsModuleOptions {
  /** Where the account administration routes are mounted, e.g. /api/v1. */
  routePrefix: string
}

/**
 * Composition root of the account administration (admin-accounts design D1). The account reads stay in the
 * catalog module; this one owns the writes.
 */
export const accountsModule = fp(
  async (app: FastifyInstance, options: AccountsModuleOptions) => {
    await app.register(accountAdminRoutes, { prefix: options.routePrefix })
  },
  { name: 'accounts-module', dependencies: ['prisma', 'auth'] },
)
