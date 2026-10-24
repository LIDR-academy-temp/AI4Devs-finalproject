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
  const response = await fetch(`${baseUrl}${API_PREFIX}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
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
  return (await response.json()) as T;
}

export const apiGet = <T>(path: string) => request<T>('GET', path);
export const apiPost = <T>(path: string, body?: unknown) => request<T>('POST', path, body);
