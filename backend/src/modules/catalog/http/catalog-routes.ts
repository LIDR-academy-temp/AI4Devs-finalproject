import {
  AccountChannelItem,
  AccountDetail,
  AccountSummary,
  ChannelAccountItem,
  ChannelSummary,
  ChannelsQuery,
  ErrorResponse,
  MerchantSummary,
  ProviderDetail,
  ProviderSummary,
} from '@recon/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import type { CatalogService } from '../application/catalog-service.js'
import { scopeOf } from '../domain/scope.js'

export interface CatalogRoutesOptions {
  service: CatalogService
}

const IntId = z.coerce.number().int().positive()
const MerchantParams = z.object({ merchantId: IntId })
const ProviderParams = z.object({ providerId: IntId })
const AccountParams = z.object({ accountId: z.uuid() })
const ChannelParams = z.object({ channelId: IntId })

// README §4.4 leaves the Permission column empty for the catalog: any authenticated role reads within its scope.
const catalog = { tags: ['catalog'], security: [{ bearerAuth: [] }] }

/** README §4.4, Catálogo rows. Mounted under /api/v1. */
export const catalogRoutes: FastifyPluginAsyncZod<CatalogRoutesOptions> = async (app, { service }) => {
  app.get(
    '/merchants',
    {
      preHandler: app.authenticate,
      schema: {
        ...catalog,
        summary: 'Merchants visible to the caller',
        response: { 200: z.array(MerchantSummary), 401: ErrorResponse },
      },
    },
    async (request) => service.listMerchants(scopeOf(request.auth)),
  )

  app.get(
    '/merchants/:merchantId/providers',
    {
      preHandler: app.authenticate,
      schema: {
        ...catalog,
        summary: 'Providers of a merchant',
        params: MerchantParams,
        response: { 200: z.array(ProviderSummary), 400: ErrorResponse, 401: ErrorResponse, 404: ErrorResponse },
      },
    },
    async (request) => service.listProviders(scopeOf(request.auth), request.params.merchantId),
  )

  app.get(
    '/providers/:providerId',
    {
      preHandler: app.authenticate,
      schema: {
        ...catalog,
        summary: 'Provider with its merchant, accounts and channels',
        params: ProviderParams,
        response: { 200: ProviderDetail, 400: ErrorResponse, 401: ErrorResponse, 404: ErrorResponse },
      },
    },
    async (request) => service.getProvider(scopeOf(request.auth), request.params.providerId),
  )

  app.get(
    '/providers/:providerId/channels',
    {
      preHandler: app.authenticate,
      schema: {
        ...catalog,
        summary: 'Channels of a provider, with their settlement parameters',
        params: ProviderParams,
        response: { 200: z.array(ChannelSummary), 400: ErrorResponse, 401: ErrorResponse, 404: ErrorResponse },
      },
    },
    async (request) => service.listProviderChannels(scopeOf(request.auth), request.params.providerId),
  )

  app.get(
    '/providers/:providerId/accounts',
    {
      preHandler: app.authenticate,
      schema: {
        ...catalog,
        summary: 'Accounts of a provider',
        params: ProviderParams,
        response: { 200: z.array(AccountSummary), 400: ErrorResponse, 401: ErrorResponse, 404: ErrorResponse },
      },
    },
    async (request) => service.listProviderAccounts(scopeOf(request.auth), request.params.providerId),
  )

  app.get(
    '/accounts/:accountId',
    {
      preHandler: app.authenticate,
      schema: {
        ...catalog,
        summary: 'Account detail with its provider and merchant',
        params: AccountParams,
        response: { 200: AccountDetail, 400: ErrorResponse, 401: ErrorResponse, 404: ErrorResponse },
      },
    },
    async (request) => service.getAccount(scopeOf(request.auth), request.params.accountId),
  )

  app.get(
    '/accounts/:accountId/channels',
    {
      preHandler: app.authenticate,
      schema: {
        ...catalog,
        summary: 'Channels associated to an account (primary and historical) with their current primary account',
        params: AccountParams,
        response: { 200: z.array(AccountChannelItem), 400: ErrorResponse, 401: ErrorResponse, 404: ErrorResponse },
      },
    },
    async (request) => service.listAccountChannels(scopeOf(request.auth), request.params.accountId),
  )

  app.get(
    '/channels',
    {
      preHandler: app.authenticate,
      schema: {
        ...catalog,
        summary: 'Channels in scope; unassigned=true keeps only those with transactions and no account',
        querystring: ChannelsQuery,
        response: { 200: z.array(ChannelSummary), 400: ErrorResponse, 401: ErrorResponse },
      },
    },
    async (request) => service.listChannels(scopeOf(request.auth), { unassigned: request.query.unassigned }),
  )

  app.get(
    '/channels/:channelId/accounts',
    {
      preHandler: app.authenticate,
      schema: {
        ...catalog,
        summary: 'Accounts associated to a channel and which one is primary',
        params: ChannelParams,
        response: { 200: z.array(ChannelAccountItem), 400: ErrorResponse, 401: ErrorResponse, 404: ErrorResponse },
      },
    },
    async (request) => service.listChannelAccounts(scopeOf(request.auth), request.params.channelId),
  )
}
