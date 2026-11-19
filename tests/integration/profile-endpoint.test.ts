import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { getGroups } from "../../src/app/api/v1/groups/definitions";
import { patchMe } from "../../src/app/api/v1/me/definitions";
import { users } from "../../src/server/db/schema";
import { createRouteHandler } from "../../src/server/http/route";
import type { SessionUser } from "../../src/server/http/session";
import { meSchema } from "../../src/server/http/schemas";
import { createUser } from "../support/factories";
import {
  apiRequest,
  createTestDatabase,
  expectMatchesSchema,
  testDependencies,
} from "../support/routes";

// PATCH /me (docs/05-API.md, section 2; FR-04, BR-04, BR-32). Each test uses
// its own onboarded user, so the seed users stay as they are.

const { pool, db } = createTestDatabase();
afterAll(() => pool.end());

const dependencies = testDependencies({ db });
const patch = createRouteHandler(patchMe, dependencies);

async function onboardedUser(language: "es" | "en" = "es") {
  const user = await createUser(db, {
    name: "Teresa Díaz",
    language,
    whatsappNumber: "+12025550166",
    onboardedAt: new Date(),
    termsAcceptedAt: new Date(),
  });
  const session: SessionUser = { id: user.id, language, onboarded: true };
  return { user, session };
}

function patchWith(session: SessionUser, body: unknown) {
  return patch(apiRequest("/me", { method: "PATCH", session, body }));
}

async function storedUser(id: string) {
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row!;
}

describe("PATCH /me", () => {
  it("AC-04 a user can't remove their WhatsApp number", async () => {
    const { user, session } = await onboardedUser();

    for (const whatsappNumber of [null, "", "   "]) {
      const response = await patchWith(session, { whatsappNumber });

      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.error.code).toBe("VALIDATION_FAILED");
      expect(body.error.fields).toHaveProperty("whatsappNumber");
    }

    expect((await storedUser(user.id)).whatsappNumber).toBe("+12025550166");
  });

  it("FR-04 a user changes their language", async () => {
    const { user, session } = await onboardedUser("es");

    const response = await patchWith(session, { language: "en" });

    expect(response.status).toBe(200);
    const body = await response.json();
    expectMatchesSchema(meSchema, body);
    expect(body.language).toBe("en");
    expect((await storedUser(user.id)).language).toBe("en");

    // Later error messages follow the saved language.
    const refused = await patchWith({ ...session, language: "en" }, {});
    expect((await refused.json()).error.message).toBe(
      "Check the highlighted fields.",
    );
  });

  it("FR-04 a user turns email off", async () => {
    const { user, session } = await onboardedUser();

    const response = await patchWith(session, { receiveEmails: false });

    expect(response.status).toBe(200);
    expect((await response.json()).receiveEmails).toBe(false);
    expect((await storedUser(user.id)).receiveEmails).toBe(false);
  });

  it("FR-04 a user changes their WhatsApp number", async () => {
    const { user, session } = await onboardedUser();

    const response = await patchWith(session, {
      whatsappNumber: "+1 202 555 0155",
    });

    expect(response.status).toBe(200);
    expect((await storedUser(user.id)).whatsappNumber).toBe("+12025550155");
  });

  it("BR-32 an invalid number isn't saved", async () => {
    const { user, session } = await onboardedUser();

    const response = await patchWith(session, { whatsappNumber: "555-01" });

    expect(response.status).toBe(422);
    expect((await response.json()).error.fields).toHaveProperty(
      "whatsappNumber",
    );
    expect((await storedUser(user.id)).whatsappNumber).toBe("+12025550166");
  });

  it("T-04 an empty change is refused", async () => {
    const { session } = await onboardedUser();

    const response = await patchWith(session, {});

    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe("VALIDATION_FAILED");
  });

  it("T-04 a user who hasn't completed onboarding can't change their profile", async () => {
    const user = await createUser(db);

    const response = await patchWith(
      { id: user.id, language: null, onboarded: false },
      { receiveEmails: false },
    );

    expect(response.status).toBe(403);
  });

  it("T-04 the change applies only to the signed-in user", async () => {
    const first = await onboardedUser();
    const second = await onboardedUser();

    await patchWith(first.session, { receiveEmails: false });

    expect((await storedUser(second.user.id)).receiveEmails).toBe(true);
    // Other endpoints keep working for an onboarded user.
    const listGroups = createRouteHandler(getGroups, dependencies);
    expect(
      (await listGroups(apiRequest("/groups", { session: first.session })))
        .status,
    ).toBe(200);
  });
});
