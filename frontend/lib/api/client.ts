/** The three failure cases the UI handles differently: re-authenticate, explain, or retry. */
export type ApiErrorKind = "unauthenticated" | "forbidden" | "failed";

export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  getIdToken: () => string | null;
}

export interface ApiClient {
  get<TResponse>(path: string): Promise<TResponse>;
}

function kindForStatus(status: number): ApiErrorKind {
  if (status === 401) return "unauthenticated";
  if (status === 403) return "forbidden";
  return "failed";
}

/** The only place that calls fetch and attaches the token. Components never call fetch. */
export function createApiClient({ baseUrl, getIdToken }: ApiClientOptions): ApiClient {
  async function request<TResponse>(path: string, init: RequestInit): Promise<TResponse> {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    const idToken = getIdToken();
    if (idToken) {
      headers.set("Authorization", `Bearer ${idToken}`);
    }

    const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
    if (!response.ok) {
      throw new ApiError(kindForStatus(response.status), response.status, `Request to ${path} failed`);
    }
    return (await response.json()) as TResponse;
  }

  return {
    get: <TResponse,>(path: string) => request<TResponse>(path, { method: "GET" }),
  };
}
