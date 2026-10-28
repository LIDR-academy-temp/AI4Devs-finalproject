import { getAccessToken } from './accessTokenStore'
import { refreshOnce } from './refreshSession'

const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

export type ApiProblem = {
  title?: string
  detail?: string
  status?: number
  code?: string
}

export async function apiGet<T>(
  path: string,
  token?: string | null,
  retried = false,
): Promise<{ data?: T; problem?: ApiProblem; status: number }> {
  const authToken = token ?? getAccessToken()
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
    return apiGet<T>(path, getAccessToken(), true)
  }

  const text = await response.text()
  let json: unknown = null
  if (text) {
    try {
      json = JSON.parse(text)
    } catch {
      json = null
    }
  }

  if (!response.ok) {
    return { status: response.status, problem: problemFromJson(json, response.status) }
  }

  return { status: response.status, data: json as T }
}

export async function apiPatch<T>(
  path: string,
  body?: unknown,
  token?: string | null,
  retried = false,
): Promise<{ data?: T; problem?: ApiProblem; status: number }> {
  const authToken = token ?? getAccessToken()
  const headers: Record<string, string> = {}
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: 'PATCH',
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (response.status === 401 && !retried && (await refreshOnce())) {
    return apiPatch<T>(path, body, getAccessToken(), true)
  }

  if (response.status === 204) {
    return { status: 204 }
  }

  const text = await response.text()
  let json: unknown = null
  if (text) {
    try {
      json = JSON.parse(text)
    } catch {
      json = null
    }
  }

  if (!response.ok) {
    return { status: response.status, problem: problemFromJson(json, response.status) }
  }

  return { status: response.status, data: json as T }
}

export async function apiPut<T>(
  path: string,
  body: unknown,
  token?: string | null,
  retried = false,
): Promise<{ data?: T; problem?: ApiProblem; status: number }> {
  const authToken = token ?? getAccessToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: 'PUT',
    headers,
    credentials: 'include',
    body: JSON.stringify(body),
  })

  if (response.status === 401 && !retried && (await refreshOnce())) {
    return apiPut<T>(path, body, getAccessToken(), true)
  }

  const text = await response.text()
  let json: unknown = null
  if (text) {
    try {
      json = JSON.parse(text)
    } catch {
      json = null
    }
  }

  if (!response.ok) {
    return { status: response.status, problem: problemFromJson(json, response.status) }
  }

  return { status: response.status, data: json as T }
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  token?: string | null,
  retried = false,
): Promise<{ data?: T; problem?: ApiProblem; status: number }> {
  const authToken = token ?? getAccessToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(body),
  })

  if (response.status === 401 && !retried && (await refreshOnce())) {
    return apiPost<T>(path, body, getAccessToken(), true)
  }

  const text = await response.text()
  let json: unknown = null
  if (text) {
    try {
      json = JSON.parse(text)
    } catch {
      json = null
    }
  }

  if (!response.ok) {
    return {
      status: response.status,
      problem: problemFromJson(json, response.status),
    }
  }

  return { status: response.status, data: json as T }
}

export async function apiDelete(
  path: string,
  token?: string | null,
  retried = false,
): Promise<{ problem?: ApiProblem; status: number }> {
  const authToken = token ?? getAccessToken()
  const headers: Record<string, string> = {}
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: 'DELETE',
    headers,
    credentials: 'include',
  })

  if (response.status === 401 && !retried && (await refreshOnce())) {
    return apiDelete(path, getAccessToken(), true)
  }

  if (!response.ok) {
    const text = await response.text()
    let json: unknown = null
    if (text) {
      try {
        json = JSON.parse(text)
      } catch {
        json = null
      }
    }
    return { status: response.status, problem: problemFromJson(json, response.status) }
  }

  return { status: response.status }
}

function problemFromJson(json: unknown, status: number): ApiProblem {
  if (!json || typeof json !== 'object') {
    return { status }
  }
  const o = json as Record<string, unknown>
  const detail =
    typeof o.detail === 'string'
      ? o.detail
      : typeof o.message === 'string'
        ? o.message
        : firstValidationMessage(o)
  return {
    title: typeof o.title === 'string' ? o.title : undefined,
    detail,
    status: typeof o.status === 'number' ? o.status : status,
    code:
      typeof o.code === 'string'
        ? o.code
        : typeof o.title === 'string'
          ? o.title
          : undefined,
  }
}

function firstValidationMessage(o: Record<string, unknown>): string | undefined {
  const errors = o.errors
  if (Array.isArray(errors) && errors.length > 0 && typeof errors[0] === 'string') {
    return errors[0]
  }
  if (errors && typeof errors === 'object' && !Array.isArray(errors)) {
    for (const value of Object.values(errors as Record<string, unknown>)) {
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
        return value[0]
      }
    }
  }
  return undefined
}
