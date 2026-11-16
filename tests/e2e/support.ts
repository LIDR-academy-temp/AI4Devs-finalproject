import { randomUUID } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import {
  type APIRequestContext,
  expect,
  type Locator,
  type Page,
  test,
} from "@playwright/test";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import en from "../../src/i18n/en.json";
import es from "../../src/i18n/es.json";
import * as schema from "../../src/server/db/schema";
import { testDatabaseUrl } from "../support/test-database";

// Helpers for the browser tests. Each scenario signs up its own users through
// the development-only sign-in, so the seed users never change
// (docs/07-SECURITY-AND-TESTING.md, sections 2.3 and 2.4).

export const messages = { en, es } as const;

export type Language = keyof typeof messages;

/** An email no other scenario uses. */
export function newEmail(): string {
  return `e2e-${randomUUID()}@example.com`;
}

function appOrigin(): string {
  const baseURL = test.info().project.use.baseURL;
  if (!baseURL) throw new Error("playwright.config.ts sets no baseURL.");
  return new URL(baseURL).origin;
}

/** Changes carry the app's own origin, as the browser sends it (docs/07-SECURITY-AND-TESTING.md, section 1). */
export function sameOrigin() {
  return { origin: appOrigin() };
}

/** The language chosen on Welcome, as its selector keeps it. */
export async function chooseLanguage(page: Page, language: Language) {
  await page
    .context()
    .addCookies([{ name: "language", value: language, url: appOrigin() }]);
}

/** Signs the page's browser in as a new or existing user, as the Welcome form does. */
export async function signInAs(page: Page, email = newEmail()) {
  const response = await page.request.post("/api/auth/dev/sign-in", {
    data: { email },
    headers: sameOrigin(),
  });
  expect(response.ok()).toBe(true);
  return email;
}

/** Signs up a new user and completes onboarding through the API. */
export async function signUpOnboarded(
  page: Page,
  { language = "es" as Language, whatsappNumber = "+12025550123" } = {},
) {
  const email = await signInAs(page);
  const response = await page.request.post("/api/v1/me/onboarding", {
    data: { language, whatsappNumber, acceptsTerms: true },
    headers: sameOrigin(),
  });
  expect(response.ok()).toBe(true);
  return email;
}

/** The signed-in user, as GET /me returns them. */
export async function readMe(page: Page) {
  const response = await page.request.get("/api/v1/me");
  expect(response.ok()).toBe(true);
  return response.json();
}

/** Fails with the list of violations when the automated WCAG 2.1 AA checks find any. */
export async function expectNoAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    results.violations.map(({ id, nodes }) => ({
      id,
      targets: nodes.map((node) => node.target),
    })),
  ).toEqual([]);
}

/**
 * Like `expectNoAccessibilityViolations`, for a screen that a refused change
 * is refreshing to show the latest (BR-20). While the refresh renders, the
 * page has no title for a moment, so the checks run again until the refresh
 * settles; a violation that stays still fails.
 */
export async function expectNoAccessibilityViolationsAfterRefresh(page: Page) {
  await expect(() => expectNoAccessibilityViolations(page)).toPass({
    timeout: 5_000,
  });
}

/**
 * Holds back the server's answer for screens whose address matches `url`, so
 * their loading state stays on screen until `release` is called. Prefetches
 * go through at once: they bring the loading state itself.
 */
export async function holdScreen(page: Page, url: string) {
  let release = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route(url, async (route) => {
    const headers = route.request().headers();
    if (headers["rsc"] && !headers["next-router-prefetch"]) await held;
    await route.continue();
  });
  return release;
}

/** The seed users (docs/04-DATA-MODEL.md, section 3) that browser tests sign in as, only to look. */
export type SeedUser = "ana" | "juan" | "luis" | "pedro";

/** Signs in as a seed user. Scenarios that sign in this way change nothing. */
export async function signInAsSeedUser(page: Page, name: SeedUser) {
  return signInAs(page, `${name}@example.com`);
}

/**
 * Makes the user with this email a member of a new group with this name, and
 * returns the group's ID. No milestone 1 endpoint gives a user a second group,
 * so this writes to the test database that the app under test uses.
 */
export async function addMemberGroup(email: string, groupName: string) {
  return withTestDatabase(async (db) => {
    const userId = await userIdOf(db, email);
    const [group] = await db
      .insert(schema.groups)
      .values({ name: groupName, ownerId: userId })
      .returning({ id: schema.groups.id });
    if (!group) throw new Error("The group insert returned no row.");
    await db.insert(schema.memberships).values({
      groupId: group.id,
      userId,
      type: "member",
      joinedAt: new Date(),
    });
    return group.id;
  });
}

type TestDatabase = ReturnType<typeof drizzle<typeof schema>>;

/** Runs `work` against the test database that the app under test uses. */
async function withTestDatabase<T>(work: (db: TestDatabase) => Promise<T>) {
  const pool = new Pool({
    connectionString: testDatabaseUrl(process.env.DATABASE_URL),
  });
  try {
    return await work(drizzle(pool, { schema }));
  } finally {
    await pool.end();
  }
}

async function userIdOf(db: TestDatabase, email: string) {
  const [user] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email));
  if (!user) throw new Error(`No user has the email ${email}.`);
  return user.id;
}

/**
 * Makes the user with this email a member or buyer of the group. No milestone
 * 1 endpoint adds a user to a group, so this writes to the test database.
 */
export async function addMember(
  email: string,
  groupId: string,
  type: "member" | "buyer" = "member",
) {
  await withTestDatabase(async (db) => {
    await db.insert(schema.memberships).values({
      groupId,
      userId: await userIdOf(db, email),
      type,
      joinedAt: new Date(),
    });
  });
}

/**
 * Changes an item's status as another request would, raising its version
 * (BR-20). The reservation endpoints aren't built yet, so this writes to the
 * test database.
 */
export async function setItemStatus(
  itemId: string,
  status: "reserved" | "purchased" | "shipped" | "unavailable",
  buyerEmail: string,
) {
  await withTestDatabase(async (db) => {
    await db
      .update(schema.items)
      .set({
        status,
        buyerId: await userIdOf(db, buyerEmail),
        unavailableNote: status === "unavailable" ? "Out of stock" : null,
        version: sql`${schema.items.version} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(schema.items.id, itemId));
  });
}

/** Deletes a list and its items, for the "No lists yet" state. */
export async function deleteList(listId: string) {
  await withTestDatabase(async (db) => {
    await db.delete(schema.lists).where(eq(schema.lists.id, listId));
  });
}

/** The signed-in user's first group and its lists, in creation order. */
export async function myGroup(page: Page) {
  const me = await readMe(page);
  const groupId: string = me.memberships[0].groupId;
  const response = await page.request.get(`/api/v1/groups/${groupId}/lists`);
  expect(response.ok()).toBe(true);
  const { lists }: { lists: { id: string; name: string }[] } =
    await response.json();
  return { groupId, lists };
}

/** Creates a list through the API, as New list does. */
export async function createList(page: Page, groupId: string, name: string) {
  const response = await page.request.post(`/api/v1/groups/${groupId}/lists`, {
    data: { name },
    headers: sameOrigin(),
  });
  expect(response.status()).toBe(201);
  const list: { id: string; name: string } = await response.json();
  return list;
}

/** Creates an item through the API, as the item form does. */
export async function createItem(
  page: Page,
  listId: string,
  body: {
    name: string;
    url?: string;
    quantity?: number;
    notes?: string;
  },
) {
  const response = await page.request.post(`/api/v1/lists/${listId}/items`, {
    data: body,
    headers: sameOrigin(),
  });
  expect(response.status()).toBe(201);
  const item: { id: string; name: string; version: number } =
    await response.json();
  return item;
}

/** The code of a seed invitation: the length of a real one, but plainly not random (scripts/seed-data.ts). */
export function seedInvitationCode(
  name: "pending" | "expired" | "accepted" | "cancelled" | "declined",
) {
  return `seed-${name}-`.padEnd(43, "0");
}

export type CreatedInvitation = {
  groupId: string;
  groupName: string;
  /** The Invitation screen's address, from the link. */
  path: string;
};

/**
 * Creates an invitation to the signed-in member's group through the API, as
 * Create link does. `api` is a page's `request`, or the test's own `request`
 * for an inviter with a cookie jar apart from the invitee's.
 */
export async function createInvitation(
  api: APIRequestContext,
  body: { type: "member" | "buyer"; inviteeName?: string },
): Promise<CreatedInvitation> {
  const me = await (await api.get("/api/v1/me")).json();
  const { groupId, groupName } = me.memberships[0];
  const response = await api.post(`/api/v1/groups/${groupId}/invitations`, {
    data: body,
    headers: sameOrigin(),
  });
  expect(response.status()).toBe(201);
  const { link } = await response.json();
  return { groupId, groupName, path: new URL(link).pathname };
}

/**
 * Signs up a new member in the given request context, apart from the page, and
 * has them invite someone: the inviter in flow C.
 */
export async function inviteFromNewMember(
  request: APIRequestContext,
  body: { type: "member" | "buyer"; inviteeName?: string },
  language: Language = "en",
): Promise<CreatedInvitation> {
  const signIn = await request.post("/api/auth/dev/sign-in", {
    data: { email: newEmail() },
    headers: sameOrigin(),
  });
  expect(signIn.ok()).toBe(true);
  const onboarding = await request.post("/api/v1/me/onboarding", {
    data: { language, whatsappNumber: "+12025550144", acceptsTerms: true },
    headers: sameOrigin(),
  });
  expect(onboarding.ok()).toBe(true);
  return createInvitation(request, body);
}

/**
 * React's hydration errors: in a production build, the minified errors 418,
 * 423 and 425 with a link to react.dev; in development, the full message.
 */
const hydrationError =
  /react\.dev\/errors\/(418|423|425)\b|react error #(418|423|425)\b|hydrat/i;

/**
 * Starts collecting the page's hydration errors, from uncaught errors and
 * console errors alike. Call it before opening the screen; the returned list
 * fills in as the page reports them. Other errors are left out, so a test
 * fails only for a hydration error.
 */
export function collectHydrationErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => {
    const text = `${error.message}\n${error.stack ?? ""}`;
    if (hydrationError.test(text)) errors.push(error.message);
  });
  page.on("console", (message) => {
    if (message.type() === "error" && hydrationError.test(message.text())) {
      errors.push(message.text());
    }
  });
  return errors;
}

/**
 * Waits until React has hydrated the element, so what a test types reaches the
 * component's state. Typing earlier changes only the page's HTML: on a slow
 * browser the form then still sees an empty field when it's submitted.
 */
export async function waitUntilHydrated(locator: Locator) {
  await expect
    .poll(() =>
      locator.evaluate((element) =>
        Object.keys(element).some((key) => key.startsWith("__reactProps$")),
      ),
    )
    .toBe(true);
}
