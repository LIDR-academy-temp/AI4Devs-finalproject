import { expect, type Page, test } from "@playwright/test";

import messages from "../../src/i18n/es.json";

// Verifies the page security headers in docs/07-SECURITY-AND-TESTING.md, section 1,
// against the production build.

test("T-03 a page has the security headers", async ({ page }) => {
  // Records every policy violation the browser reports, from the first script on.
  await page.addInitScript(() => {
    const violations: string[] = [];
    (window as unknown as { __violations: string[] }).__violations = violations;
    document.addEventListener("securitypolicyviolation", (event) => {
      violations.push(`${event.violatedDirective} ${event.blockedURI}`);
    });
  });
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  const response = await page.goto("/");
  expect(response).not.toBeNull();
  const headers = response!.headers();

  expect(headers["strict-transport-security"]).toBe(
    "max-age=63072000; includeSubDomains",
  );
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");

  const policy = headers["content-security-policy"];
  expect(policy).toContain("frame-ancestors 'none'");
  const nonce = /'nonce-([^']+)'/.exec(policy)?.[1];
  expect(nonce).toBeTruthy();
  expect(policy).toMatch(/script-src [^;]*'strict-dynamic'/);
  expect(policy).not.toMatch(/script-src [^;]*'unsafe-inline'/);
  expect(policy).not.toMatch(/script-src [^;]*'unsafe-eval'/);

  // The page still works: it renders, and every script Next.js added carries the nonce.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    messages.welcome.title,
  );
  const scriptNonces = await page
    .locator("script")
    .evaluateAll((scripts) =>
      scripts.map((script) => (script as HTMLScriptElement).nonce),
    );
  expect(scriptNonces.length).toBeGreaterThan(0);
  for (const scriptNonce of scriptNonces) expect(scriptNonce).toBe(nonce);

  await page.waitForLoadState("networkidle");
  const violations = await page.evaluate(
    () => (window as unknown as { __violations: string[] }).__violations,
  );
  expect(violations).toEqual([]);
  expect(
    consoleErrors.filter((text) => /content security policy/i.test(text)),
  ).toEqual([]);
});

test("T-03 each page request gets its own nonce", async ({ request }) => {
  const nonceOf = async () => {
    const response = await request.get("/");
    return /'nonce-([^']+)'/.exec(
      response.headers()["content-security-policy"],
    )?.[1];
  };
  const first = await nonceOf();
  const second = await nonceOf();
  expect(first).toBeTruthy();
  expect(second).not.toBe(first);
});

/**
 * Adds HTML with an inline event handler to the page, the way user text shown
 * as HTML would, and returns what ran. (A <script> set through HTML never runs,
 * and a script that page code creates itself is trusted under 'strict-dynamic',
 * so neither tests the policy.)
 */
async function injectInlineHandler(page: Page): Promise<string[]> {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  return page.evaluate(async () => {
    const state = window as unknown as { __injected: string[] };
    state.__injected = [];
    const holder = document.createElement("div");
    holder.innerHTML =
      '<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="" onerror="window.__injected.push(\'handler\')" onload="window.__injected.push(\'handler\')">';
    document.body.append(holder);
    await new Promise((resolve) => setTimeout(resolve, 300));
    return state.__injected;
  });
}

test("T-03 inline script added to the page doesn't run", async ({
  page,
  browser,
}) => {
  expect(await injectInlineHandler(page)).toEqual([]);

  // The control: with the policy turned off, the same handler runs, so the
  // policy is what stopped it above.
  const withoutPolicy = await browser.newContext({ bypassCSP: true });
  try {
    const ran = await injectInlineHandler(await withoutPolicy.newPage());
    expect(ran).toEqual(["handler"]);
  } finally {
    await withoutPolicy.close();
  }
});

test("T-03 an API address that has no route still gets the API policy", async ({
  request,
}) => {
  const response = await request.get("/api/v1/no-such-endpoint");
  const headers = response.headers();

  expect(response.status()).toBe(404);
  expect(headers["content-security-policy"]).toBe(
    "default-src 'none'; frame-ancestors 'none'",
  );
  expect(headers["x-content-type-options"]).toBe("nosniff");
});
