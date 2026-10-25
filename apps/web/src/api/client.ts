/**
 * Cliente HTTP base. En desarrollo las rutas /api se proxean a la API (vite.config.ts);
 * en producción VITE_API_URL apunta al backend desplegado.
 * Añade el token de sesión y, ante un 401 en una ruta protegida, limpia la sesión y avisa
 * a la aplicación para que redirija a /login.
 */
import { clearSession, getToken } from '@/auth/session';

const baseUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export const API_PREFIX = '/api/v1';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let onUnauthorized: (() => void) | undefined;

/** Registra el callback que se ejecuta cuando la API rechaza el token (401). */
export function setUnauthorizedHandler(handler: (() => void) | undefined): void {
  onUnauthorized = handler;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const isForm = body instanceof FormData;
  const response = await fetch(`${baseUrl}${API_PREFIX}${path}`, {
    method,
    headers: {
      // Con FormData el navegador fija el Content-Type (con el boundary)
      ...(body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
  });

  if (!response.ok) {
    // El login devuelve 401 por credenciales incorrectas: no es una sesión caducada
    if (response.status === 401 && token) {
      clearSession();
      onUnauthorized?.();
    }
    const payload = (await response.json().catch(() => null)) as { message?: unknown } | null;
    const message = typeof payload?.message === 'string' ? payload.message : undefined;
    throw new ApiError(response.status, message ?? `Error ${response.status} al consultar ${path}`);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const apiGet = <T>(path: string) => request<T>('GET', path);
export const apiUpload = <T>(path: string, form: FormData) => request<T>('POST', path, form);
export const apiPost = <T>(path: string, body?: unknown) => request<T>('POST', path, body);
export const apiPutUpload = <T>(path: string, form: FormData) => request<T>('PUT', path, form);
export const apiPatch = <T>(path: string, body?: unknown) => request<T>('PATCH', path, body);
export const apiDelete = (path: string) => request<void>('DELETE', path);
