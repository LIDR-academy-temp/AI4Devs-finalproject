export type SignatureRequestStatus = 'pending' | 'signing' | 'signed' | 'failed'

export interface DocumentResult {
  id: string
  external_document_id: string | null
  version_number: number
  is_active_version: boolean
  signing_status: 'draft' | 'pending_signature' | 'signed'
  signature_level: string | null
  file_name: string
  size_bytes: number
  download_url: string
}

export interface CertificateSummary {
  subject: string
  serial_number: string
}

export interface SignatureRequest {
  id: string
  status: SignatureRequestStatus
  provider: 'local' | 'token' | 'firmar'
  certificate: CertificateSummary | null
  document: DocumentResult
  created_at: string
  signed_at: string | null
}

export interface PrepareResponse {
  challenges: Array<{
    challenge_id: string
    document_name: string
    hash_algorithm: string
    hash_to_sign: string
  }>
  expires_at: string
}

export type ApiErrorKind = 'expired_link' | 'not_found' | 'unavailable'

export class ApiError extends Error {
  readonly kind: ApiErrorKind

  constructor(kind: ApiErrorKind) {
    super(kind)
    this.name = 'ApiError'
    this.kind = kind
  }
}

function errorFor(status: number): ApiError {
  if (status === 401) return new ApiError('expired_link')
  if (status === 404) return new ApiError('not_found')
  return new ApiError('unavailable')
}

function signingFetch(
  fetchImpl: typeof fetch,
  token: string,
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  return (async () => {
    let response: Response
    try {
      response = await fetchImpl(url, {
        ...init,
        headers: { 'X-Signing-Token': token, ...(init.headers as Record<string, string> | undefined) },
      })
    } catch {
      throw new ApiError('unavailable')
    }
    if (!response.ok) throw errorFor(response.status)
    return response
  })()
}

export function createApi(baseUrl: string, token: string, fetchImpl: typeof fetch = fetch.bind(globalThis)) {
  const get = (url: string) => signingFetch(fetchImpl, token, url)
  const post = (url: string, body?: unknown) =>
    signingFetch(fetchImpl, token, url, {
      method: 'POST',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })

  return {
    async getSignatureRequest(requestId: string): Promise<SignatureRequest> {
      const response = await get(`${baseUrl}/signature-requests/${requestId}`)
      return (await response.json()) as SignatureRequest
    },
    async downloadPdf(downloadUrl: string): Promise<ArrayBuffer> {
      const response = await get(downloadUrl)
      return response.arrayBuffer()
    },
    async prepareSignature(requestId: string): Promise<PrepareResponse> {
      const response = await signingFetch(fetchImpl, token, `${baseUrl}/signature-requests/${requestId}/prepare`, {
        method: 'POST',
      })
      if (!response.ok) throw errorFor(response.status)
      return (await response.json()) as PrepareResponse
    },
    async completeSignature(requestId: string): Promise<SignatureRequest> {
      const response = await signingFetch(fetchImpl, token, `${baseUrl}/signature-requests/${requestId}/complete`, {
        method: 'POST',
      })
      if (!response.ok) throw errorFor(response.status)
      return (await response.json()) as SignatureRequest
    },
  }
}

export type FirmadocApi = ReturnType<typeof createApi>
