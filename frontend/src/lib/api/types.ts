// Named response types derived from the generated contract (design D6). Never hand-written.
import type { paths } from './schema.gen'

type JsonBody<R> = R extends { content: { 'application/json': infer Body } } ? Body : never
type Method = 'get' | 'post' | 'put' | 'patch' | 'delete'

/** JSON body of the `status` response (200 by default) of `method path`. */
export type ApiResponse<P extends keyof paths, M extends Method, S extends number = 200> = JsonBody<
  NonNullable<paths[P][M]> extends { responses: infer R } ? (R extends { [K in S]: infer Ok } ? Ok : never) : never
>

export type TokenPair = ApiResponse<'/api/v1/auth/login', 'post'>
export type Me = ApiResponse<'/api/v1/auth/me', 'get'>
export type MerchantSummary = ApiResponse<'/api/v1/merchants', 'get'>[number]
export type ProviderSummary = ApiResponse<'/api/v1/merchants/{merchantId}/providers', 'get'>[number]
export type ProviderDetail = ApiResponse<'/api/v1/providers/{providerId}', 'get'>
export type AccountSummary = ProviderDetail['accounts'][number]
export type ChannelSummary = ApiResponse<'/api/v1/channels', 'get'>[number]
export type AccountChannelItem = ApiResponse<'/api/v1/accounts/{accountId}/channels', 'get'>[number]
export type Permission = Me['permissions'][number]
export type AccountDetail = ApiResponse<'/api/v1/accounts/{accountId}', 'get'>

export type ImportDetail = ApiResponse<'/api/v1/imports/{importId}', 'get'>
export type ImportFile = ImportDetail['files'][number]
export type ImportSheet = ImportFile['sheets'][number]
export type ImportStatus = ImportDetail['status']
export type ChannelNoticeItem = NonNullable<ImportDetail['channels']>[number]
export type ImportRowsPage = ApiResponse<'/api/v1/imports/{importId}/rows', 'get'>
export type ImportRowItem = ImportRowsPage['items'][number]
export type ImportRowsQuery = NonNullable<paths['/api/v1/imports/{importId}/rows']['get']['parameters']['query']>
/** Body of `PUT /imports/{id}/mapping`. */
export type MappingConfirmationBody =
  paths['/api/v1/imports/{importId}/mapping']['put']['requestBody']['content']['application/json']
