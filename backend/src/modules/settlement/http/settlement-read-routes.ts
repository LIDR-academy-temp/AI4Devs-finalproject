import {
  ErrorResponse,
  ExportQuery,
  ImportSettlements,
  SettlementTransactionsPage,
  SettlementTransactionsQuery,
  SettlementView,
} from '@recon/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { scopeOf } from '../../catalog/domain/scope.js'
import type { SettlementReadService } from '../application/settlement-read-service.js'

export interface SettlementReadRoutesOptions {
  service: SettlementReadService
}

const BatchParams = z.object({ batchId: z.uuid() })
const ImportParams = z.object({ importId: z.uuid() })
const settlements = { tags: ['settlements'], security: [{ bearerAuth: [] }] }
const readErrors = { 400: ErrorResponse, 401: ErrorResponse, 404: ErrorResponse }

/** README §4.4, rows of the reads and exports of an attempt (summary-exports, contract for #13). Mounted under /api/v1. */
export const settlementReadRoutes: FastifyPluginAsyncZod<SettlementReadRoutesOptions> = async (app, { service }) => {
  app.get(
    '/settlements/:batchId',
    {
      preHandler: app.authenticate,
      schema: {
        ...settlements,
        summary: 'The attempt as written: the same view as the 201 of processing',
        description:
          'Seeded attempts without a processing audit answer validationSummary null and nothing skipped. Previous ' +
          'accounts of assigned channels outside the caller scope are hidden. 404 also outside the scope.',
        params: BatchParams,
        response: { 200: SettlementView, ...readErrors },
      },
    },
    async (request) => service.view(scopeOf(request.auth), request.params.batchId),
  )

  app.get(
    '/settlements/:batchId/transactions',
    {
      preHandler: app.authenticate,
      schema: {
        ...settlements,
        summary: 'Movements of one cycle of the attempt, with their fee breakdown, in a stable order',
        description:
          'type is required (E, I or R); page from 1, pageSize 1-500 (50). settled is true only when the attempt ' +
          'is paid.',
        params: BatchParams,
        querystring: SettlementTransactionsQuery,
        response: { 200: SettlementTransactionsPage, ...readErrors },
      },
    },
    async (request) => service.transactions(scopeOf(request.auth), request.params.batchId, request.query),
  )

  app.get(
    '/imports/:importId/settlements',
    {
      preHandler: app.authenticate,
      schema: {
        ...settlements,
        summary: 'Attempts of the import, current and undone, newest first',
        params: ImportParams,
        response: { 200: ImportSettlements, ...readErrors },
      },
    },
    async (request) => service.importSettlements(scopeOf(request.auth), request.params.importId),
  )

  app.get(
    '/settlements/:batchId/export',
    {
      preHandler: app.requirePermission('reports.view'),
      schema: {
        ...settlements,
        summary: 'Download the merchant summary or a Back-Office CSV of the attempt',
        description:
          'RFC 4180 CSV (comma, CRLF, UTF-8 without BOM), named <account>_B<batchNo>_A<attemptNo>_<type>.csv in ' +
          'Content-Disposition. Every download is audited (settlement.export) and changes no state; errors are JSON. ' +
          '403 before the scope; 500 internal_error, without the file, when the download cannot be audited.',
        params: BatchParams,
        querystring: ExportQuery,
        response: {
          200: { description: 'The CSV file', content: { 'text/csv': { schema: z.string() } } },
          ...readErrors,
          403: ErrorResponse,
          500: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const { fileName, body } = await service.export(
        scopeOf(request.auth),
        request.auth.userId,
        request.params.batchId,
        request.query.type,
      )
      // A string with a non-JSON content type is sent as it is, without the JSON serializer.
      return reply
        .header('content-type', 'text/csv; charset=utf-8')
        .header('content-disposition', `attachment; filename="${fileName}"`)
        .header('cache-control', 'no-store')
        .send(body)
    },
  )
}
