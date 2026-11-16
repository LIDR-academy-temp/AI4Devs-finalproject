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

export interface SignatureRequest {
  id: string
  status: SignatureRequestStatus
  provider: 'local' | 'token' | 'firmar'
  document: DocumentResult
  created_at: string
  signed_at: string | null
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

export function createApi(baseUrl: string, token: string, fetchImpl: typeof fetch = fetch.bind(globalThis)) {
  async function get(url: string): Promise<Response> {
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { 'X-Signing-Token': token } })
    } catch {
      throw new ApiError('unavailable')
    }
    if (!response.ok) throw errorFor(response.status)
    return response
  }

  return {
    async getSignatureRequest(requestId: string): Promise<SignatureRequest> {
      const response = await get(`${baseUrl}/signature-requests/${requestId}`)
      return (await response.json()) as SignatureRequest
    },
    async downloadPdf(downloadUrl: string): Promise<ArrayBuffer> {
      const response = await get(downloadUrl)
      return response.arrayBuffer()
    },
  }
}

export type FirmadocApi = ReturnType<typeof createApi>
