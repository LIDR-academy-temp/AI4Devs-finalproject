import { randomUUID } from 'node:crypto'
import multipart from '@fastify/multipart'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { PrismaMatchingRulesRepository } from '../matching/infrastructure/prisma-matching-rules-repository.js'
import { ImportService } from './application/import-service.js'
import type { FileStore } from './application/ports.js'
import { MAX_FILE_BYTES, MAX_FILES_PER_REQUEST } from './domain/upload-policy.js'
import { importRoutes } from './http/import-routes.js'
import { FsFileStore } from './infrastructure/fs-file-store.js'
import { PrismaImportRepository } from './infrastructure/prisma-import-repository.js'
import { XlsxWorkbookReader } from './infrastructure/xlsx-workbook-reader.js'

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
        reader: new XlsxWorkbookReader(),
        rules: new PrismaMatchingRulesRepository(app.prisma),
        ids: randomUUID,
        log: app.log,
      })
    await app.register(importRoutes, { prefix: options.routePrefix, service, files })
  },
  { name: 'imports-module', dependencies: ['prisma', 'auth'] },
)
