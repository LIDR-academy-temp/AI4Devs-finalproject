import { getUserManager } from "@/lib/auth/user-manager";

/** The three failure cases the UI handles differently: re-authenticate, explain, or retry. */
export type ApiErrorKind = "unauthenticated" | "forbidden" | "failed";

export interface ApiErrorResponse {
  code?: string;
  message?: string;
  detail?: string;
}

export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    readonly status: number,
    message: string,
    readonly code?: string,
    readonly errorResponse?: ApiErrorResponse,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiClient {
  get<TResponse>(path: string): Promise<TResponse>;
  post<TResponse>(path: string, body: unknown): Promise<TResponse>;
}

function kindForStatus(status: number): ApiErrorKind {
  if (status === 401) return "unauthenticated";
  if (status === 403) return "forbidden";
  return "failed";
}

/** The only place that calls fetch and attaches the token. Components never call fetch. */
export function createApiClient({ baseUrl }: { baseUrl: string }): ApiClient {
  if (!baseUrl || !baseUrl.trim()) {
    throw new Error("baseUrl must not be empty");
  }

  async function request<TResponse>(path: string, init: RequestInit): Promise<TResponse> {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");

    // Get token from oidc-client-ts UserManager
    const user = await getUserManager().getUser();
    if (user && !user.expired && user.id_token) {
      headers.set("Authorization", `Bearer ${user.id_token}`);
    }

    const response = await fetch(`${baseUrl}${path}`, { ...init, headers });

    if (!response.ok) {
      // Parse error response to include code and message
      let errorResponse: ApiErrorResponse = {};
      try {
        errorResponse = (await response.json()) as ApiErrorResponse;
      } catch {
        // If response is not JSON, that's OK
      }

      const kind = kindForStatus(response.status);
      const error = new ApiError(
        kind,
        response.status,
        errorResponse.message || errorResponse.detail || `Request to ${path} failed`,
        errorResponse.code,
        errorResponse,
      );

      // On 401, remove the user session
      if (response.status === 401) {
        await getUserManager().removeUser();
      }

      throw error;
    }

    return (await response.json()) as TResponse;
  }

  return {
    get: <TResponse,>(path: string) => request<TResponse>(path, { method: "GET" }),
    post: <TResponse,>(path: string, body: unknown) =>
      request<TResponse>(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
  };
}
