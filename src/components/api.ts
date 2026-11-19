import { LANGUAGE_COOKIE } from "@/shared/languages";

// Sends JSON to /api/v1 from the browser and reads the answer in the error
// format of docs/05-API.md, section 1. A request that never got an answer is
// reported apart, so the form can keep what the user typed and say to check
// the connection (docs/02-UX-DESIGN.md, section 2.7).

export type ApiError = {
  code: string;
  message: string;
  fields?: Record<string, string>;
};

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError }
  | { ok: false; offline: true };

export async function sendJson<T>(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body: unknown,
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin",
    });
  } catch {
    return { ok: false, offline: true };
  }
  const data: unknown = await response.json().catch(() => null);
  if (response.ok) return { ok: true, data: data as T };
  const error = (data as { error?: ApiError } | null)?.error;
  return error
    ? { ok: false, error }
    : { ok: false, error: { code: "INTERNAL_ERROR", message: "" } };
}

/** The cookie that keeps the language chosen before sign-in, for a year. */
export function rememberLanguage(language: string) {
  document.cookie = `${LANGUAGE_COOKIE}=${language}; path=/; max-age=31536000; samesite=lax`;
}
