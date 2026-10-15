// Request/response schemas of the auth API (README §4.4).
import { z } from 'zod'
import { PermissionCode } from './permissions.js'

export const MerchantScope = z.enum(['assigned', 'all'])
export type MerchantScope = z.infer<typeof MerchantScope>

export const LoginRequest = z.object({
  userName: z.string().min(1).max(50),
  // Upper bound keeps Argon2 work per request bounded.
  password: z.string().min(1).max(256),
})
export type LoginRequest = z.infer<typeof LoginRequest>

export const RefreshRequest = z.object({
  refreshToken: z.string().min(1),
})
export type RefreshRequest = z.infer<typeof RefreshRequest>

export const TokenPair = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  /** Access token lifetime in seconds. */
  expiresIn: z.number().int().positive(),
})
export type TokenPair = z.infer<typeof TokenPair>

export const MerchantRef = z.object({
  merchantId: z.number().int(),
  name: z.string(),
})
export type MerchantRef = z.infer<typeof MerchantRef>

export const MeResponse = z.object({
  userId: z.number().int(),
  userName: z.string(),
  displayName: z.string(),
  email: z.string(),
  role: z.string(),
  permissions: z.array(PermissionCode),
  merchantScope: MerchantScope,
  merchants: z.array(MerchantRef),
})
export type MeResponse = z.infer<typeof MeResponse>

/** Uniform error body (README §4). */
export const ErrorResponse = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
})
export type ErrorResponse = z.infer<typeof ErrorResponse>
