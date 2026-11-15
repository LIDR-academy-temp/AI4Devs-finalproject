import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { getGroups } from "../../src/app/api/v1/groups/definitions";
import { getMe } from "../../src/app/api/v1/me/definitions";
import { postOnboarding } from "../../src/app/api/v1/me/onboarding/definitions";
import { seedIds } from "../../scripts/seed-data";
import {
  groups,
  invitations,
  lists,
  memberships,
  users,
} from "../../src/server/db/schema";
import { createRouteHandler } from "../../src/server/http/route";
import type { SessionUser } from "../../src/server/http/session";
import { meSchema } from "../../src/server/http/schemas";
import { createInvitation, createUser } from "../support/factories";
import {
  apiRequest,
  createTestDatabase,
  expectMatchesSchema,
  testClock,
  testDependencies,
} from "../support/routes";

// POST /me/onboarding (docs/05-API.md, section 2; FR-02, FR-03, BR-01, BR-04,
// BR-06) and the onboarding check on other endpoints (API section 1).

const { pool, db } = createTestDatabase();
afterAll(() => pool.end());

const now = new Date("2026-11-10T12:00:00Z");
const { clock } = testClock(now);
const dependencies = testDependencies({ db, clock });
const onboard = createRouteHandler(postOnboarding, dependencies);

const validAnswers = {
  language: "en",
  whatsappNumber: "+12025550188",
  acceptsTerms: true,
};

/** A signed-in user who hasn't completed onboarding and has no membership. */
async function newUser(name = "Marta López") {
  const user = await createUser(db, { name });
  const session: SessionUser = {
    id: user.id,
    language: null,
    onboarded: false,
  };
  return { user, session };
}

function postAnswers(session: SessionUser, body: unknown) {
  return onboard(
    apiRequest("/me/onboarding", { method: "POST", session, body }),
  );
}

async function storedUser(id: string) {
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row!;
}

async function membershipsOf(userId: string) {
  return db.select().from(memberships).where(eq(memberships.userId, userId));
}

async function expectRefused(response: Response, field: string) {
  expect(response.status).toBe(422);
  const body = await response.json();
  expect(body.error.code).toBe("VALIDATION_FAILED");
  expect(body.error.fields).toHaveProperty(field);
}

describe("POST /me/onboarding", () => {
  it("AC-02 onboarding without the age and terms acceptance is refused", async () => {
    const { user, session } = await newUser();

    for (const acceptsTerms of [undefined, false]) {
      await expectRefused(
        await postAnswers(session, { ...validAnswers, acceptsTerms }),
        "acceptsTerms",
      );
    }

    expect(await storedUser(user.id)).toMatchObject({
      onboardedAt: null,
      termsAcceptedAt: null,
      whatsappNumber: null,
    });
    expect(await membershipsOf(user.id)).toEqual([]);
  });

  it("AC-03 an invalid WhatsApp number isn't saved", async () => {
    const { user, session } = await newUser();

    for (const whatsappNumber of ["12345", "+1 202 555", "not a number", ""]) {
      await expectRefused(
        await postAnswers(session, { ...validAnswers, whatsappNumber }),
        "whatsappNumber",
      );
    }

    expect(await storedUser(user.id)).toMatchObject({
      whatsappNumber: null,
      onboardedAt: null,
    });
  });

  it("BR-06 completing onboarding gives a new user their group and first list", async () => {
    const { user, session } = await newUser("Marta López");

    const response = await postAnswers(session, validAnswers);

    expect(response.status).toBe(200);
    const body = await response.json();
    expectMatchesSchema(meSchema, body);
    expect(body).toMatchObject({
      id: user.id,
      language: "en",
      whatsappNumber: "+12025550188",
      onboarded: true,
    });
    expect(body.memberships).toHaveLength(1);
    expect(body.memberships[0]).toMatchObject({
      groupName: "Marta's group",
      type: "member",
      isOwner: true,
    });
    const [list] = await db
      .select()
      .from(lists)
      .where(eq(lists.groupId, body.memberships[0].groupId));
    expect(list?.name).toBe("My list");
    expect(await storedUser(user.id)).toMatchObject({
      termsAcceptedAt: now,
      onboardedAt: now,
    });
  });

  it("BR-06 the group and list are named in the chosen language", async () => {
    const { session } = await newUser("Marta López");

    const body = await (
      await postAnswers(session, { ...validAnswers, language: "es" })
    ).json();

    expect(body.memberships[0].groupName).toBe("Grupo de Marta");
  });

  it("BR-06 completing onboarding with an invitation creates no group", async () => {
    const { user, session } = await newUser();
    const invitation = await createInvitation(db, {
      groupId: seedIds.groups.garcia,
      createdBy: seedIds.users.ana,
    });

    const response = await postAnswers(session, {
      ...validAnswers,
      invitationCode: invitation.code,
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expectMatchesSchema(meSchema, body);
    expect(body).toMatchObject({ onboarded: true, memberships: [] });
    expect(
      await db.select().from(groups).where(eq(groups.ownerId, user.id)),
    ).toEqual([]);
    const [stored] = await db
      .select({ status: invitations.status })
      .from(invitations)
      .where(eq(invitations.id, invitation.id));
    expect(stored?.status).toBe("pending");
  });

  it("BR-06 an invitation that no longer works doesn't stop getting started", async () => {
    const used = async (status: "accepted" | "cancelled" | "declined") =>
      (
        await createInvitation(db, {
          groupId: seedIds.groups.garcia,
          createdBy: seedIds.users.ana,
          status,
        })
      ).code;
    const expired = (
      await createInvitation(db, {
        groupId: seedIds.groups.garcia,
        createdBy: seedIds.users.ana,
        expiresAt: now,
      })
    ).code;
    const codes = [
      expired,
      await used("cancelled"),
      await used("accepted"),
      await used("declined"),
      "x".repeat(43),
      "not a code",
    ];

    for (const invitationCode of codes) {
      const { user, session } = await newUser();
      const response = await postAnswers(session, {
        ...validAnswers,
        invitationCode,
      });

      expect(response.status).toBe(200);
      const [owned] = await db
        .select({ id: groups.id })
        .from(groups)
        .where(eq(groups.ownerId, user.id));
      expect(owned, invitationCode).toBeDefined();
      expect(
        await db.select().from(lists).where(eq(lists.groupId, owned!.id)),
      ).toHaveLength(1);
    }
  });

  it("BR-04 the number is saved in international format", async () => {
    const { user, session } = await newUser();

    const response = await postAnswers(session, {
      ...validAnswers,
      whatsappNumber: "+1 (202) 555-0189",
    });

    expect(response.status).toBe(200);
    expect((await storedUser(user.id)).whatsappNumber).toBe("+12025550189");
  });

  it("T-04 completing onboarding again changes nothing", async () => {
    const { user, session } = await newUser();
    await postAnswers(session, validAnswers);
    const before = await storedUser(user.id);

    const response = await postAnswers(
      { ...session, onboarded: true },
      { language: "es", whatsappNumber: "+12025550177", acceptsTerms: true },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      language: "en",
      whatsappNumber: "+12025550188",
    });
    expect(await storedUser(user.id)).toEqual(before);
    expect(await membershipsOf(user.id)).toHaveLength(1);
  });

  it("T-04 two onboarding requests at once create one group", async () => {
    const { user, session } = await newUser();

    const responses = await Promise.all([
      postAnswers(session, validAnswers),
      postAnswers(session, validAnswers),
    ]);

    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    const owned = await db
      .select()
      .from(groups)
      .where(eq(groups.ownerId, user.id));
    expect(owned).toHaveLength(1);
  });

  it("T-04 onboarding without a session is rejected", async () => {
    const response = await onboard(
      apiRequest("/me/onboarding", { method: "POST", body: validAnswers }),
    );

    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("NOT_SIGNED_IN");
  });
});

describe("the onboarding check", () => {
  it("T-04 a user who hasn't completed onboarding is refused", async () => {
    const { session } = await newUser();
    const listGroups = createRouteHandler(getGroups, dependencies);

    const response = await listGroups(apiRequest("/groups", { session }));

    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("FORBIDDEN");
  });

  it("T-04 a user who hasn't completed onboarding can read themselves and complete it", async () => {
    const { session } = await newUser();
    const readMe = createRouteHandler(getMe, dependencies);

    expect((await readMe(apiRequest("/me", { session }))).status).toBe(200);
    expect((await postAnswers(session, validAnswers)).status).toBe(200);
  });
});
