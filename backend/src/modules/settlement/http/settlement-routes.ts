import {
  ErrorResponse,
  NextBatchNumber,
  NextBatchNumberQuery,
  SettlementPreview,
  SettlementRequest,
  SettlementView,
} from '@recon/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { scopeOf } from '../../catalog/domain/scope.js'
import type { SettlementService } from '../application/settlement-service.js'

export interface SettlementRoutesOptions {
  service: SettlementService
}

const ImportParams = z.object({ importId: z.uuid() })
const AccountParams = z.object({ accountId: z.uuid() })
const settlements = { tags: ['settlements'], security: [{ bearerAuth: [] }] }
const readErrors = { 400: ErrorResponse, 401: ErrorResponse, 404: ErrorResponse }
const writeErrors = { ...readErrors, 403: ErrorResponse, 409: ErrorResponse }

/** README §4.3 and §4.4, rows Settlement (settlement-process, contract for #13). Mounted under /api/v1. */
export const settlementRoutes: FastifyPluginAsyncZod<SettlementRoutesOptions> = async (app, { service }) => {
  app.post(
    '/imports/:importId/settlements',
    {
      preHandler: app.requirePermission('settlement.process'),
      schema: {
        ...settlements,
        summary: 'Process the validated import as a batch attempt (processed, pending payment)',
        description:
          'runId is the reviewed validation run. 409 import_not_validated, validation_run_required, ' +
          'validation_run_superseded, blocking_validation_issue, batch_no_taken, channel_assignment_not_confirmed; ' +
          '400 batch_fee_invalid. No movement is Settled until the batch is paid.',
        params: ImportParams,
        body: SettlementRequest,
        response: { 201: SettlementView, ...writeErrors },
      },
    },
    async (request, reply) => {
      const view = await service.process(
        scopeOf(request.auth),
        request.auth.userId,
        request.params.importId,
        request.body,
      )
      return reply.status(201).send(view)
    },
  )

  app.post(
    '/imports/:importId/settlements/preview',
    {
      preHandler: app.requirePermission('settlement.process'),
      schema: {
        ...settlements,
        summary: 'What processing would do, without writing anything',
        description:
          'Same body as processing; answers 200 with a SettlementPreview. 409 import_not_validated, ' +
          'validation_run_required, validation_run_superseded, blocking_validation_issue; 400 batch_fee_invalid. ' +
          'batch_no_taken and channel_assignment_not_confirmed are not errors here: a number with an active attempt is ' +
          'batchNoAvailable: false, and channels to assign are requiresChannelConfirmation: true with channelsToAssign.',
        params: ImportParams,
        body: SettlementRequest,
        response: { 200: SettlementPreview, ...writeErrors },
      },
    },
    async (request) => service.preview(scopeOf(request.auth), request.params.importId, request.body),
  )

  app.get(
    '/accounts/:accountId/batch-number/next',
    {
      preHandler: app.authenticate,
      schema: {
        ...settlements,
        summary: 'Proposed batch number of the account (the same one again to reprocess an undone attempt)',
        params: AccountParams,
        querystring: NextBatchNumberQuery,
        response: { 200: NextBatchNumber, ...readErrors },
      },
    },
    async (request) => service.nextBatchNumber(scopeOf(request.auth), request.params.accountId, request.query.importId),
  )
}
