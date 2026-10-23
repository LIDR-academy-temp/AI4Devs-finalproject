import {
  ErrorResponse,
  ImportDetail,
  ImportRowItem,
  ImportRowsPage,
  ImportRowsQuery,
  ImportSummary,
  ImportsQuery,
  IntId,
  MappingConfirmation,
  ResolveRowBody,
} from '@recon/shared'
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
/** A row is identified by its sheet and its row number in the sheet (README §3.2 ImportRow). */
const ImportRowParams = z.object({ importId: z.uuid(), sheetId: z.uuid(), rowNo: IntId })

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

  // ───────────────────────── import-analyze (README §4.4 rows Importación; HU1 CA4–CA8) ─────────────────────────

  app.put(
    '/imports/:importId/mapping',
    {
      preHandler: app.requirePermission('settlement.process'),
      schema: {
        ...imports,
        summary: 'Confirm the mapping of every sheet of the import; the import moves to mapped',
        params: ImportParams,
        body: MappingConfirmation,
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
    async (request) => service.confirmMapping(scopeOf(request.auth), request.params.importId, request.body),
  )

  app.post(
    '/imports/:importId/analyze',
    {
      preHandler: app.requirePermission('settlement.process'),
      schema: {
        ...imports,
        summary: 'Parse the rows with the confirmed mapping and cross-match them by external identity',
        description:
          'The import must be mapped (409 import_not_mapped otherwise). An incomplete mapping answers 422 mapping_incomplete; ' +
          'more than the allowed transaction rows per import answers 422 import_too_large.',
        params: ImportParams,
        response: {
          200: ImportDetail,
          401: ErrorResponse,
          403: ErrorResponse,
          404: ErrorResponse,
          409: ErrorResponse,
          422: ErrorResponse,
        },
      },
    },
    async (request) => service.analyze(scopeOf(request.auth), request.params.importId),
  )

  app.get(
    '/imports/:importId/rows',
    {
      preHandler: app.authenticate,
      schema: {
        ...imports,
        summary: 'Rows of an analyzed import, unmatched and ambiguous first (empty before the analysis)',
        params: ImportParams,
        querystring: ImportRowsQuery,
        response: { 200: ImportRowsPage, 400: ErrorResponse, 401: ErrorResponse, 404: ErrorResponse },
      },
    },
    async (request) => service.listRows(scopeOf(request.auth), request.params.importId, request.query),
  )

  app.patch(
    '/imports/:importId/rows/:sheetId/:rowNo',
    {
      preHandler: app.requirePermission('settlement.process'),
      schema: {
        ...imports,
        summary: 'Resolve an ambiguous row by choosing the gateway among its candidates (audited)',
        params: ImportRowParams,
        body: ResolveRowBody,
        response: {
          200: ImportRowItem,
          400: ErrorResponse,
          401: ErrorResponse,
          403: ErrorResponse,
          404: ErrorResponse,
          409: ErrorResponse,
        },
      },
    },
    async (request) =>
      service.resolveRow(
        scopeOf(request.auth),
        request.auth.userId,
        request.params.importId,
        request.params.sheetId,
        request.params.rowNo,
        request.body.gatewayId,
      ),
  )

  app.post(
    '/imports/:importId/cancel',
    {
      preHandler: app.requirePermission('settlement.process'),
      schema: {
        ...imports,
        summary: 'Cancel an import that is not processed, keeping its files, rows and findings',
        params: ImportParams,
        response: { 200: ImportDetail, 401: ErrorResponse, 403: ErrorResponse, 404: ErrorResponse, 409: ErrorResponse },
      },
    },
    async (request) => service.cancel(scopeOf(request.auth), request.auth.userId, request.params.importId),
  )
}
