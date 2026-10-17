import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, createApiClient } from "@/lib/api/client";

function stubFetch(status: number, body: unknown = {}) {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createApiClient", () => {
  it("attaches the ID token as a bearer token and returns the parsed body", async () => {
    const fetchMock = stubFetch(200, { status: "ok" });
    const client = createApiClient({ baseUrl: "http://localhost/api", getIdToken: () => "id-token" });

    const body = await client.get<{ status: string }>("/health");

    expect(body).toEqual({ status: "ok" });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("http://localhost/api/health");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer id-token");
  });

  it("sends no Authorization header when there is no session", async () => {
    const fetchMock = stubFetch(200);
    const client = createApiClient({ baseUrl: "http://localhost/api", getIdToken: () => null });

    await client.get("/health");

    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(new Headers(init?.headers).has("Authorization")).toBe(false);
  });

  it.each([
    [401, "unauthenticated"],
    [403, "forbidden"],
    [500, "failed"],
  ] as const)("reports HTTP %i as a %s error", async (status, kind) => {
    stubFetch(status, { code: "x", message: "y" });
    const client = createApiClient({ baseUrl: "http://localhost/api", getIdToken: () => "id-token" });

    const failure = client.get("/anything");

    await expect(failure).rejects.toBeInstanceOf(ApiError);
    await expect(failure).rejects.toMatchObject({ kind, status });
  });
});
