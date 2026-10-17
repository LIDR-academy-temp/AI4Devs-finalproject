import { ErrorResponse, ImportDetail, ImportSummary, ImportsQuery } from '@recon/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { scopeOf } from '../../catalog/domain/scope.js'
import type { ImportService } from '../application/import-service.js'
import type { FileStore } from '../application/ports.js'
import { collectUploads } from './multipart.js'

export interface ImportRoutesOptions {
  service: ImportService
  /** Where the multipart parts are staged before the service takes over. */
  files: FileStore
}

const AccountParams = z.object({ accountId: z.uuid() })
const ImportParams = z.object({ importId: z.uuid() })
const ImportFileParams = z.object({ importId: z.uuid(), fileId: z.uuid() })

const imports = { tags: ['imports'], security: [{ bearerAuth: [] }] }
// The body is consumed as a multipart stream, so it is documented here rather than validated by a schema.
const multipartBody = {
  consumes: ['multipart/form-data'],
  description:
    'multipart/form-data with 1 to 10 `files` parts, each a `.xlsx` of at most 20 MiB. ' +
    'Rejected as a whole when any part fails: 400 (type, size, count), 409 (same bytes already in the import), 422 (unreadable workbook).',
}
const uploadErrors = {
  400: ErrorResponse,
  401: ErrorResponse,
  403: ErrorResponse,
  404: ErrorResponse,
  409: ErrorResponse,
  422: ErrorResponse,
}

/** README §4.2 and §4.4, rows Importación (this change: upload, files, list, detail). Mounted under /api/v1. */
export const importRoutes: FastifyPluginAsyncZod<ImportRoutesOptions> = async (app, { service, files }) => {
  app.post(
    '/accounts/:accountId/imports',
    {
      preHandler: app.requirePermission('settlement.process'),
      schema: {
        ...imports,
        ...multipartBody,
        summary: 'Upload one or more template files and get the mapping proposal',
        params: AccountParams,
        response: { 201: ImportDetail, ...uploadErrors },
      },
    },
    async (request, reply) => {
      const uploads = await collectUploads(request, files)
      const detail = await service.createImport(
        scopeOf(request.auth),
        request.auth.userId,
        request.params.accountId,
        uploads,
      )
      return reply.status(201).send(detail)
    },
  )

  app.post(
    '/imports/:importId/files',
    {
      preHandler: app.requirePermission('settlement.process'),
      schema: {
        ...imports,
        ...multipartBody,
        summary: 'Add files to an import before it is analyzed',
        params: ImportParams,
        response: { 200: ImportDetail, ...uploadErrors },
      },
    },
    async (request) => {
      const uploads = await collectUploads(request, files)
      return service.addFiles(scopeOf(request.auth), request.params.importId, uploads)
    },
  )

  app.delete(
    '/imports/:importId/files/:fileId',
    {
      preHandler: app.requirePermission('settlement.process'),
      schema: {
        ...imports,
        summary: 'Remove a file from an import before it is analyzed',
        params: ImportFileParams,
        response: {
          200: ImportDetail,
          400: ErrorResponse,
          401: ErrorResponse,
          403: ErrorResponse,
          404: ErrorResponse,
          409: ErrorResponse,
        },
      },
    },
    async (request) => service.removeFile(scopeOf(request.auth), request.params.importId, request.params.fileId),
  )

  app.get(
    '/imports/:importId',
    {
      preHandler: app.authenticate,
      schema: {
        ...imports,
        summary: 'Import detail: files, sheets, mapping proposal, preview and readiness',
        params: ImportParams,
        response: { 200: ImportDetail, 400: ErrorResponse, 401: ErrorResponse, 404: ErrorResponse },
      },
    },
    async (request) => service.getImport(scopeOf(request.auth), request.params.importId),
  )

  app.get(
    '/accounts/:accountId/imports',
    {
      preHandler: app.authenticate,
      schema: {
        ...imports,
        summary: 'Imports of an account, newest first, optionally filtered by status',
        params: AccountParams,
        querystring: ImportsQuery,
        response: { 200: z.array(ImportSummary), 400: ErrorResponse, 401: ErrorResponse, 404: ErrorResponse },
      },
    },
    async (request) => service.listImports(scopeOf(request.auth), request.params.accountId, request.query.status),
  )
}
