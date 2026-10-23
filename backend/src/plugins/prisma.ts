import { PrismaMssql } from '@prisma/adapter-mssql'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import type { Env } from '../config/env.js'
import { PrismaClient } from '../generated/prisma/client.js'
import { mssqlConfigFromEnv } from '../infrastructure/db.js'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

export interface PrismaPluginOptions {
  env: Env
  /** Injected client (tests). Its lifecycle belongs to the caller, so it is not disconnected on close. */
  client?: PrismaClient
}

export const prismaPlugin = fp(
  async (app: FastifyInstance, options: PrismaPluginOptions) => {
    const owned = !options.client
    const prisma = options.client ?? new PrismaClient({ adapter: new PrismaMssql(mssqlConfigFromEnv(options.env)) })

    app.decorate('prisma', prisma)
    if (owned) {
      app.addHook('onClose', async () => {
        await prisma.$disconnect()
      })
    }
  },
  { name: 'prisma' },
)
