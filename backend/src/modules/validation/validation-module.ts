import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { ValidationService } from './application/validation-service.js'
import { validationRoutes } from './http/validation-routes.js'
import { PrismaValidationRunRepository } from './infrastructure/prisma-validation-run-repository.js'
import { PrismaValidationSources } from './infrastructure/prisma-validation-sources.js'

export interface ValidationModuleOptions {
  /** Where the validation routes are mounted, e.g. /api/v1. */
  routePrefix: string
  /** Injected service (tests); otherwise built on the Prisma sources and run repository. */
  service?: ValidationService
}

/** Composition root of the validation module: read sources, run repository, service and routes. */
export const validationModule = fp(
  async (app: FastifyInstance, options: ValidationModuleOptions) => {
    const service =
      options.service ??
      new ValidationService({
        sources: new PrismaValidationSources(app.prisma),
        runs: new PrismaValidationRunRepository(app.prisma),
        log: app.log,
      })
    await app.register(validationRoutes, { prefix: options.routePrefix, service })
  },
  { name: 'validation-module', dependencies: ['prisma', 'auth'] },
)
