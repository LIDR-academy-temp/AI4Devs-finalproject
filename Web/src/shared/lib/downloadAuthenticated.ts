import { getAccessToken } from './accessTokenStore'
import type { ApiProblem } from './apiClient'
import { refreshOnce } from './refreshSession'

const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

function problemFromStatus(status: number, detail?: string): ApiProblem {
  return { status, detail: detail ?? `Error ${status}` }
}

export type DownloadResult =
  | { ok: true; blob: Blob }
  | { ok: false; status: number; problem?: ApiProblem }

export async function downloadAuthenticated(
  path: string,
  retried = false,
): Promise<DownloadResult> {
  const authToken = getAccessToken()
  const headers: Record<string, string> = {}
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: 'GET',
    headers,
    credentials: 'include',
  })

  if (response.status === 401 && !retried && (await refreshOnce())) {
    return downloadAuthenticated(path, true)
  }

  if (!response.ok) {
    const text = await response.text()
    let detail: string | undefined
    if (text) {
      try {
        const json = JSON.parse(text) as { detail?: string; title?: string }
        detail = json.detail ?? json.title
      } catch {
        detail = text.slice(0, 200)
      }
    }
    return {
      ok: false,
      status: response.status,
      problem: problemFromStatus(response.status, detail),
    }
  }

  const blob = await response.blob()
  return { ok: true, blob }
}
