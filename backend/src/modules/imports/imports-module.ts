import { randomUUID } from 'node:crypto'
import multipart from '@fastify/multipart'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { PrismaAuditLogger } from '../../infrastructure/prisma-audit-logger.js'
import { PrismaMatchingRulesRepository } from '../matching/infrastructure/prisma-matching-rules-repository.js'
import { ImportService } from './application/import-service.js'
import type { FileStore } from './application/ports.js'
import { MAX_FILE_BYTES, MAX_FILES_PER_REQUEST } from './domain/upload-policy.js'
import { importRoutes } from './http/import-routes.js'
import { FsFileStore } from './infrastructure/fs-file-store.js'
import { PrismaAccountContext } from './infrastructure/prisma-account-context.js'
import { PrismaFeeTypeCatalog } from './infrastructure/prisma-fee-type-catalog.js'
import { PrismaImportRepository } from './infrastructure/prisma-import-repository.js'
import { PrismaImportRowRepository } from './infrastructure/prisma-import-row-repository.js'
import { PrismaTransactionLookup } from './infrastructure/prisma-transaction-lookup.js'
import { DEFAULT_READ_LIMITS } from './infrastructure/xlsx/limits.js'
import { XlsxWorkbookReader } from './infrastructure/xlsx-workbook-reader.js'

declare module 'fastify' {
  interface FastifyInstance {
    /** The import service of the imports module (settlement reads the pre-filled batch fees through it). */
    importService: ImportService
  }
}

export interface ImportsModuleOptions {
  /** Where the import routes are mounted, e.g. /api/v1. */
  routePrefix: string
  /** Root of the uploaded files (env UPLOAD_DIR). */
  uploadDir: string
  /** Injected service and the file store it shares with the routes (tests); otherwise Prisma + disk. */
  service?: ImportService
  files?: FileStore
}

/** Composition root of the import module: multipart parsing, file store, reader, repositories, service and routes. */
export const importsModule = fp(
  async (app: FastifyInstance, options: ImportsModuleOptions) => {
    // Design D3: a part is truncated at fileSize (we answer 400 file_too_large ourselves), the count limits are ours too.
    await app.register(multipart, {
      limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES_PER_REQUEST, fields: 10, parts: MAX_FILES_PER_REQUEST + 10 },
      throwFileSizeLimit: false,
    })

    const files = options.files ?? new FsFileStore(options.uploadDir)
    const service =
      options.service ??
      new ImportService({
        imports: new PrismaImportRepository(app.prisma),
        files,
        reader: new XlsxWorkbookReader({ log: app.log }),
        rules: new PrismaMatchingRulesRepository(app.prisma),
        ids: randomUUID,
        log: app.log,
        rows: new PrismaImportRowRepository(app.prisma),
        transactions: new PrismaTransactionLookup(app.prisma),
        accounts: new PrismaAccountContext(app.prisma),
        feeTypes: new PrismaFeeTypeCatalog(app.prisma),
        audit: new PrismaAuditLogger(app.prisma),
        limits: { maxRowsPerImport: DEFAULT_READ_LIMITS.maxRowsPerImport },
      })
    // Shared with the settlement module, which needs the pre-filled batch fees as the import detail proposes them.
    app.decorate('importService', service)
    await app.register(importRoutes, { prefix: options.routePrefix, service, files })
  },
  { name: 'imports-module', dependencies: ['prisma', 'auth'] },
)
