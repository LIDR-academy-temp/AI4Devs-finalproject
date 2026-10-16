// Named response types derived from the generated contract (design D6). Never hand-written.
import type { paths } from './schema.gen'

type JsonBody<R> = R extends { content: { 'application/json': infer Body } } ? Body : never
type Method = 'get' | 'post'

/** JSON body of the 200 response of `method path`. */
export type ApiResponse<P extends keyof paths, M extends Method> = JsonBody<
  NonNullable<paths[P][M]> extends { responses: { 200: infer Ok } } ? Ok : never
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
