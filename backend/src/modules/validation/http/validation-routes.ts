import {
  ErrorResponse,
  IntId,
  ResolveIssueBody,
  SetInclusionBody,
  ValidationIssueDetail,
  ValidationIssuesPage,
  ValidationIssuesQuery,
  ValidationRunView,
} from '@recon/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { hasPermission } from '../../auth/domain/permissions.js'
import { scopeOf } from '../../catalog/domain/scope.js'
import type { ValidationService } from '../application/validation-service.js'

export interface ValidationRoutesOptions {
  service: ValidationService
}

const ImportParams = z.object({ importId: z.uuid() })
const IssueParams = z.object({ issueId: IntId })
/** ConflictOccurrence.occurrenceId is a BIGINT: digits only, at most 19 (its range), kept as text. */
const OccurrenceParams = z.object({ occurrenceId: z.string().regex(/^\d{1,19}$/) })

const validations = { tags: ['validations'], security: [{ bearerAuth: [] }] }
const readErrors = { 400: ErrorResponse, 401: ErrorResponse, 404: ErrorResponse }
const writeErrors = { ...readErrors, 403: ErrorResponse, 409: ErrorResponse }
const actionErrors = { ...writeErrors, 422: ErrorResponse }

/** README §4.4, rows Validaciones (validation-runs, contract for #10). Mounted under /api/v1. */
export const validationRoutes: FastifyPluginAsyncZod<ValidationRoutesOptions> = async (app, { service }) => {
  app.post(
    '/imports/:importId/validations',
    {
      preHandler: app.requirePermission('settlement.process'),
      schema: {
        ...validations,
        summary: 'Run the eight validations; the previous current run is superseded',
        description:
          'Accepted in analyzed or validated (a validated import goes back to analyzed and its review is invalidated). ' +
          '409 import_not_analyzed in any other status; 409 import_changed when another write confirmed meanwhile.',
        params: ImportParams,
        response: { 201: ValidationRunView, ...writeErrors },
      },
    },
    async (request, reply) => {
      const view = await service.run(scopeOf(request.auth), request.auth.userId, request.params.importId)
      return reply.status(201).send(view)
    },
  )

  app.get(
    '/imports/:importId/validations',
    {
      preHandler: app.authenticate,
      schema: {
        ...validations,
        summary: 'The current run of the import (null without one) and its last invalidated review',
        params: ImportParams,
        response: { 200: ValidationRunView, ...readErrors },
      },
    },
    async (request) => service.getCurrentRun(scopeOf(request.auth), request.params.importId),
  )

  app.get(
    '/imports/:importId/validation-issues',
    {
      preHandler: app.authenticate,
      schema: {
        ...validations,
        summary: 'Findings of the current run, filtered and paged in a fixed order (empty without a run)',
        params: ImportParams,
        querystring: ValidationIssuesQuery,
        response: { 200: ValidationIssuesPage, ...readErrors },
      },
    },
    async (request) => service.listIssues(scopeOf(request.auth), request.params.importId, request.query),
  )

  app.get(
    '/validation-issues/:issueId',
    {
      preHandler: app.authenticate,
      schema: {
        ...validations,
        summary: 'A finding with every occurrence, its resolution and the history of changes',
        params: IssueParams,
        response: { 200: ValidationIssueDetail, ...readErrors },
      },
    },
    async (request) =>
      service.getIssue(
        scopeOf(request.auth),
        hasPermission(request.auth, 'settlement.process'),
        request.params.issueId,
      ),
  )

  app.patch(
    '/conflict-occurrences/:occurrenceId',
    {
      preHandler: app.requirePermission('settlement.process'),
      schema: {
        ...validations,
        summary: 'Include or exclude an occurrence of the current import in the settlement',
        description:
          'Accepted in analyzed or validated (a validated import goes back to analyzed and its review is invalidated). ' +
          'In cycle R at most one occurrence is included, and none when the reserve was released in a previous batch.',
        params: OccurrenceParams,
        body: SetInclusionBody,
        response: { 200: ValidationIssueDetail, ...actionErrors },
      },
    },
    async (request) =>
      service.setInclusion(
        scopeOf(request.auth),
        request.auth.userId,
        request.params.occurrenceId,
        request.body.includeInSettlement,
      ),
  )

  app.patch(
    '/validation-issues/:issueId',
    {
      preHandler: app.requirePermission('settlement.process'),
      schema: {
        ...validations,
        summary: 'Resolve by hand a non_recorded_adjustment or a status_mismatch of the current run',
        params: IssueParams,
        body: ResolveIssueBody,
        response: { 200: ValidationIssueDetail, ...actionErrors },
      },
    },
    async (request) =>
      service.resolveIssue(scopeOf(request.auth), request.auth.userId, request.params.issueId, request.body.note),
  )
}
