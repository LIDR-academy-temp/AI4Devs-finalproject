import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { seedIds } from "../../scripts/seed-data";
import {
  getInvitations,
  postInvitation,
} from "../../src/app/api/v1/groups/[groupId]/invitations/definitions";
import { deleteInvitation } from "../../src/app/api/v1/invitations/[invitationId]/definitions";
import {
  getInvitationByCode,
  postAcceptInvitation,
  postDeclineInvitation,
} from "../../src/app/api/v1/invitations/by-code/[code]/definitions";
import { postOnboarding } from "../../src/app/api/v1/me/onboarding/definitions";
import {
  groups,
  invitations,
  lists,
  memberships,
} from "../../src/server/db/schema";
import { createRouteHandler } from "../../src/server/http/route";
import {
  acceptedInvitationSchema,
  createdInvitationSchema,
  invitationCollectionSchema,
  invitationPreviewSchema,
} from "../../src/server/http/schemas";
import type { SessionUser } from "../../src/server/http/session";
import { startingGroupName } from "../../src/server/services/groups";
import { RuleViolationError } from "../../src/server/services/errors";
import { acceptInvitation } from "../../src/server/services/invitations";
import {
  createGroup,
  createInvitation,
  createMembership,
  createUser,
} from "../support/factories";
import {
  apiRequest,
  createTestDatabase,
  expectMatchesSchema,
  routeParams,
  type SeedSessionUser,
  TEST_APP_URL,
  testClock,
  testDependencies,
} from "../support/routes";

// The invitations endpoints (docs/05-API.md, section 2; FR-06, BR-06, BR-08,
// BR-09, BR-12, BR-13, BR-32), against the seed (docs/04-DATA-MODEL.md,
// section 3). Most tests use their own users and groups, so the seed stays as
// it is for the tests that read it; the ones that change seed users come last.

const { pool, db } = createTestDatabase();
afterAll(() => pool.end());

const start = new Date("2026-11-15T12:00:00Z");
const time = testClock(start);
const dependencies = testDependencies({ db, clock: time.clock });

const listHandler = createRouteHandler(getInvitations, dependencies);
const createHandler = createRouteHandler(postInvitation, dependencies);
const cancelHandler = createRouteHandler(deleteInvitation, dependencies);
const previewHandler = createRouteHandler(getInvitationByCode, dependencies);
const acceptHandler = createRouteHandler(postAcceptInvitation, dependencies);
const declineHandler = createRouteHandler(postDeclineInvitation, dependencies);
const onboardHandler = createRouteHandler(postOnboarding, dependencies);

const { garcia, perez } = seedIds.groups;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

type Who = { as?: SeedSessionUser; session?: SessionUser };

/** A member who owns a new group of their own, with a session. */
async function newMember(language: "es" | "en" = "en") {
  const user = await createUser(db, {
    name: "Nora Member",
    onboardedAt: start,
    language,
  });
  const group = await createGroup(db, { ownerId: user.id, name: "Nora's" });
  await createMembership(db, { groupId: group.id, userId: user.id });
  const session: SessionUser = { id: user.id, language, onboarded: true };
  return { user, group, session };
}

/** An onboarded user with no membership, with a session. */
async function newOnboardedUser(language: "es" | "en" = "en") {
  const user = await createUser(db, {
    name: "Olga Outsider",
    onboardedAt: start,
    language,
  });
  const session: SessionUser = { id: user.id, language, onboarded: true };
  return { user, session };
}

function list(who: Who, groupId: string) {
  return listHandler(
    apiRequest(`/groups/${groupId}/invitations`, who),
    routeParams({ groupId }),
  );
}

function create(who: Who, groupId: string, body: unknown) {
  return createHandler(
    apiRequest(`/groups/${groupId}/invitations`, {
      ...who,
      method: "POST",
      body,
    }),
    routeParams({ groupId }),
  );
}

function cancel(who: Who, invitationId: string) {
  return cancelHandler(
    apiRequest(`/invitations/${invitationId}`, { ...who, method: "DELETE" }),
    routeParams({ invitationId }),
  );
}

function preview(code: string, who: Who = {}, language = "en") {
  return previewHandler(
    apiRequest(`/invitations/by-code/${code}`, {
      ...who,
      headers: { "accept-language": language },
    }),
    routeParams({ code }),
  );
}

function accept(who: Who, code: string) {
  return acceptHandler(
    apiRequest(`/invitations/by-code/${code}/accept`, {
      ...who,
      method: "POST",
    }),
    routeParams({ code }),
  );
}

function decline(who: Who, code: string) {
  return declineHandler(
    apiRequest(`/invitations/by-code/${code}/decline`, {
      ...who,
      method: "POST",
    }),
    routeParams({ code }),
  );
}

/** Creates an invitation through the API and returns its code and ID. */
async function invite(who: Who, groupId: string, body: object) {
  const response = await create(who, groupId, body);
  expect(response.status).toBe(201);
  const created = await response.json();
  const code = new URL(created.link).pathname.split("/").pop()!;
  return { id: created.id as string, code };
}

async function errorOf(response: Response) {
  return (await response.json()).error as { code: string; reason?: string };
}

async function invitationRow(id: string) {
  const [row] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.id, id));
  return row!;
}

async function invitationCount(groupId: string) {
  return (
    await db
      .select({ id: invitations.id })
      .from(invitations)
      .where(eq(invitations.groupId, groupId))
  ).length;
}

async function membershipsOf(userId: string) {
  return db.select().from(memberships).where(eq(memberships.userId, userId));
}

async function membershipIn(groupId: string, userId: string) {
  const [row] = await db
    .select()
    .from(memberships)
    .where(
      and(eq(memberships.groupId, groupId), eq(memberships.userId, userId)),
    );
  return row;
}

/** A new user who signs up through the invitation and completes onboarding. */
async function signUpThrough(code: string, language: "es" | "en" = "en") {
  const user = await createUser(db, { name: "Carlos Pérez" });
  const before: SessionUser = { id: user.id, language: null, onboarded: false };
  const response = await onboardHandler(
    apiRequest("/me/onboarding", {
      method: "POST",
      session: before,
      body: {
        language,
        whatsappNumber: "+12025550177",
        acceptsTerms: true,
        invitationCode: code,
      },
    }),
  );
  expect(response.status).toBe(200);
  const session: SessionUser = { id: user.id, language, onboarded: true };
  return { user, session };
}

describe("GET /groups/{groupId}/invitations", () => {
  it("FR-06 only pending invitations that haven't expired are listed", async () => {
    const response = await list({ as: "ana" }, garcia);

    expect(response.status).toBe(200);
    const body = await response.json();
    expectMatchesSchema(invitationCollectionSchema, body);
    expect(body.invitations).toEqual([
      {
        id: seedIds.invitations.pending,
        type: "buyer",
        inviteeName: "Carlos",
        expiresAt: "2099-01-01T00:00:00.000Z",
      },
    ]);
    expect(JSON.stringify(body)).not.toMatch(/seed-pending|code|link/);
  });

  it("BR-12 a buyer can't list the invitations", async () => {
    const response = await list({ as: "juan" }, garcia);

    expect(response.status).toBe(403);
    expect((await errorOf(response)).code).toBe("FORBIDDEN");
  });
});

describe("POST /groups/{groupId}/invitations", () => {
  it("FR-06 a member creates a buyer invitation with a name", async () => {
    const { group, session } = await newMember();

    const response = await create({ session }, group.id, {
      type: "buyer",
      inviteeName: "Carlos",
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expectMatchesSchema(createdInvitationSchema, body);
    expect(body).toMatchObject({
      type: "buyer",
      inviteeName: "Carlos",
      expiresAt: new Date(start.getTime() + 7 * DAY_IN_MS).toISOString(),
    });
    const row = await invitationRow(body.id);
    expect(body.link).toBe(`${TEST_APP_URL}/invitations/${row.code}`);
    expect(row).toMatchObject({
      status: "pending",
      groupId: group.id,
      createdBy: session.id,
    });
  });

  it("FR-06 the invitee name is optional", async () => {
    const { group, session } = await newMember();

    const withoutName = await create({ session }, group.id, { type: "member" });
    const blankName = await create({ session }, group.id, {
      type: "member",
      inviteeName: "   ",
    });

    expect(withoutName.status).toBe(201);
    expect(blankName.status).toBe(201);
    expect((await withoutName.json()).inviteeName).toBeNull();
    expect((await blankName.json()).inviteeName).toBeNull();
  });

  it("BR-32 an invitee name over 100 characters is refused", async () => {
    const { group, session } = await newMember();

    const response = await create({ session }, group.id, {
      type: "buyer",
      inviteeName: "a".repeat(101),
    });

    expect(response.status).toBe(422);
    const error = (await response.json()).error;
    expect(error.code).toBe("VALIDATION_FAILED");
    expect(error.fields).toHaveProperty("inviteeName");
    expect(await invitationCount(group.id)).toBe(0);
  });

  it("AC-16 a buyer can't create an invitation", async () => {
    const before = await invitationCount(garcia);

    const member = await create({ as: "juan" }, garcia, { type: "member" });
    const buyer = await create({ as: "juan" }, garcia, { type: "buyer" });

    expect(member.status).toBe(403);
    expect(buyer.status).toBe(403);
    expect((await errorOf(member)).code).toBe("FORBIDDEN");
    expect((await errorOf(buyer)).code).toBe("FORBIDDEN");
    expect(await invitationCount(garcia)).toBe(before);
  });

  it("BR-13 a user outside the group can't create an invitation", async () => {
    const { session } = await newMember();

    const responses = await Promise.all(
      [garcia, randomUUID(), "not-a-uuid"].map((groupId) =>
        create({ session }, groupId, { type: "buyer" }),
      ),
    );

    const bodies = await Promise.all(responses.map((r) => r.json()));
    expect(responses.map((r) => r.status)).toEqual([404, 404, 404]);
    expect(bodies[0].error.code).toBe("NOT_AVAILABLE");
    expect(bodies[1]).toEqual(bodies[0]);
    expect(bodies[2]).toEqual(bodies[0]);
  });

  it("T-08 each invitation has its own unguessable code", async () => {
    const { group, session } = await newMember();

    const first = await invite({ session }, group.id, { type: "buyer" });
    const second = await invite({ session }, group.id, { type: "buyer" });

    expect(first.code).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(second.code).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first.code).not.toBe(second.code);
  });

  it("T-08 creating invitations is limited to 30 a day", async () => {
    const { group, session } = await newMember();
    for (let count = 0; count < 30; count++) {
      expect(
        (await create({ session }, group.id, { type: "buyer" })).status,
      ).toBe(201);
    }

    const response = await create({ session }, group.id, { type: "buyer" });

    expect(response.status).toBe(429);
    expect((await errorOf(response)).code).toBe("RATE_LIMITED");
    expect(await invitationCount(group.id)).toBe(30);
  });
});

describe("DELETE /invitations/{invitationId}", () => {
  it("FR-06 a member cancels a pending invitation", async () => {
    const { group, session } = await newMember();
    const { id, code } = await invite({ session }, group.id, {
      type: "buyer",
    });

    const response = await cancel({ session }, id);

    expect(response.status).toBe(204);
    expect((await invitationRow(id)).status).toBe("cancelled");
    expect(
      (await (await list({ session }, group.id)).json()).invitations,
    ).toEqual([]);
    const previewed = await preview(code);
    expect(previewed.status).toBe(410);
    expect((await errorOf(previewed)).code).toBe("INVITATION_INVALID");
  });

  it("BR-12 a buyer can't cancel an invitation", async () => {
    const response = await cancel({ as: "juan" }, seedIds.invitations.pending);

    expect(response.status).toBe(403);
    expect((await invitationRow(seedIds.invitations.pending)).status).toBe(
      "pending",
    );
  });

  it("BR-13 an invitation of another group is not available", async () => {
    const other = await createInvitation(db, {
      groupId: perez,
      createdBy: seedIds.users.luis,
    });

    const responses = await Promise.all(
      [other.id, randomUUID(), "not-a-uuid"].map((id) =>
        cancel({ as: "ana" }, id),
      ),
    );

    const bodies = await Promise.all(responses.map((r) => r.json()));
    expect(responses.map((r) => r.status)).toEqual([404, 404, 404]);
    expect(bodies[0].error.code).toBe("NOT_AVAILABLE");
    expect(bodies[1]).toEqual(bodies[0]);
    expect(bodies[2]).toEqual(bodies[0]);
    expect((await invitationRow(other.id)).status).toBe("pending");
  });

  it("BR-08 an invitation that is no longer pending can't be cancelled", async () => {
    const { accepted, cancelled, declined, expired } = seedIds.invitations;

    for (const id of [accepted, cancelled, declined, expired]) {
      const response = await cancel({ as: "ana" }, id);
      expect(response.status).toBe(410);
      expect((await errorOf(response)).code).toBe("INVITATION_INVALID");
    }
  });
});

describe("GET /invitations/by-code/{code}", () => {
  it("FR-06 a signed-out person sees who invites them, to which group, and as what", async () => {
    const [pending] = await db
      .select({ code: invitations.code })
      .from(invitations)
      .where(eq(invitations.id, seedIds.invitations.pending));

    const response = await preview(pending!.code);

    expect(response.status).toBe(200);
    const body = await response.json();
    expectMatchesSchema(invitationPreviewSchema, body);
    expect(body).toEqual({
      inviterName: "Ana",
      groupName: "García Group",
      type: "buyer",
      alreadyInGroup: false,
    });
    expect(JSON.stringify(body)).not.toMatch(/@|\+\d/);
  });

  it('BR-05 an invitation from a deleted account names "Former user"', async () => {
    const owner = await createUser(db, {
      name: "Deleted Inviter",
      deletedAt: start,
    });
    const group = await createGroup(db, { ownerId: owner.id });
    const invitation = await createInvitation(db, {
      groupId: group.id,
      createdBy: owner.id,
    });

    const response = await preview(invitation.code, {}, "en");

    expect(response.status).toBe(200);
    expect((await response.json()).inviterName).toBe("Former user");
  });

  it("BR-13 an unknown code is not available", async () => {
    const unknown = await preview("x".repeat(43));
    const malformed = await preview("too-short");

    expect(unknown.status).toBe(404);
    expect(malformed.status).toBe(404);
    expect((await errorOf(unknown)).code).toBe("NOT_AVAILABLE");
  });
});

describe("A used, declined, cancelled, or expired link no longer works", () => {
  it("AC-11 an invitation older than 7 days asks for a new one", async () => {
    const { group, session } = await newMember();
    const { code } = await invite({ session }, group.id, { type: "buyer" });
    const someone = await newOnboardedUser();

    time.set(new Date(start.getTime() + 7 * DAY_IN_MS + 1000));
    try {
      const previewed = await preview(code);
      const accepted = await accept({ session: someone.session }, code);

      expect(previewed.status).toBe(410);
      expect(accepted.status).toBe(410);
      expect((await errorOf(previewed)).code).toBe("INVITATION_INVALID");
      expect((await errorOf(accepted)).code).toBe("INVITATION_INVALID");
      expect(await membershipIn(group.id, someone.user.id)).toBeUndefined();
    } finally {
      time.set(start);
    }
  });

  it("AC-12 an accepted invitation asks for a new one", async () => {
    const { group, session } = await newMember();
    const { code } = await invite({ session }, group.id, { type: "buyer" });
    const first = await newOnboardedUser();
    const second = await newOnboardedUser();
    expect((await accept({ session: first.session }, code)).status).toBe(200);

    const previewed = await preview(code, { session: second.session });
    const accepted = await accept({ session: second.session }, code);

    expect(previewed.status).toBe(410);
    expect(accepted.status).toBe(410);
    expect((await errorOf(accepted)).code).toBe("INVITATION_INVALID");
    expect(await membershipIn(group.id, second.user.id)).toBeUndefined();
  });

  it("AC-13 a cancelled invitation asks for a new one", async () => {
    const { group, session } = await newMember();
    const { id, code } = await invite({ session }, group.id, {
      type: "member",
    });
    expect((await cancel({ session }, id)).status).toBe(204);
    const someone = await newOnboardedUser();

    const previewed = await preview(code);
    const accepted = await accept({ session: someone.session }, code);

    expect(previewed.status).toBe(410);
    expect(accepted.status).toBe(410);
    expect((await errorOf(accepted)).code).toBe("INVITATION_INVALID");
  });

  it("BR-08 a declined invitation asks for a new one", async () => {
    const { group, session } = await newMember();
    const { code } = await invite({ session }, group.id, { type: "buyer" });
    const decliner = await newOnboardedUser();
    const someone = await newOnboardedUser();
    expect((await decline({ session: decliner.session }, code)).status).toBe(
      204,
    );

    const previewed = await preview(code);
    const accepted = await accept({ session: someone.session }, code);

    expect(previewed.status).toBe(410);
    expect(accepted.status).toBe(410);
  });
});

describe("POST /invitations/by-code/{code}/accept", () => {
  it("AC-10 a new user with a buyer invitation joins as a buyer", async () => {
    const { group, session } = await newMember();
    const { code } = await invite({ session }, group.id, { type: "buyer" });
    const invitee = await signUpThrough(code);

    const response = await accept({ session: invitee.session }, code);

    expect(response.status).toBe(200);
    const body = await response.json();
    expectMatchesSchema(acceptedInvitationSchema, body);
    expect(body).toEqual({ groupId: group.id, type: "buyer" });
    const joined = await membershipsOf(invitee.user.id);
    expect(joined).toHaveLength(1);
    expect(joined[0]).toMatchObject({
      groupId: group.id,
      type: "buyer",
      status: "active",
    });
    const owned = await db
      .select()
      .from(groups)
      .where(eq(groups.ownerId, invitee.user.id));
    expect(owned).toEqual([]);
  });

  it("AC-100 a new user with a member invitation joins as a member", async () => {
    const { group, session } = await newMember();
    const { code, id } = await invite({ session }, group.id, {
      type: "member",
    });
    const invitee = await signUpThrough(code);

    const response = await accept({ session: invitee.session }, code);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      groupId: group.id,
      type: "member",
    });
    const joined = await membershipsOf(invitee.user.id);
    expect(joined).toHaveLength(1);
    expect(joined[0]).toMatchObject({ groupId: group.id, type: "member" });
    const owned = await db
      .select()
      .from(groups)
      .where(eq(groups.ownerId, invitee.user.id));
    expect(owned).toEqual([]);
    expect(await invitationRow(id)).toMatchObject({
      status: "accepted",
      acceptedBy: invitee.user.id,
      acceptedAt: start,
    });
  });

  it("BR-08 two people accept the same link at the same time", async () => {
    const { group, session } = await newMember();
    const { code } = await invite({ session }, group.id, { type: "buyer" });
    // Five rather than two, so the requests overlap reliably: without the
    // row lock, this fails on every run.
    const people = await Promise.all(
      Array.from({ length: 5 }, () => newOnboardedUser()),
    );

    const responses = await Promise.all(
      people.map(({ session }) => accept({ session }, code)),
    );

    expect(responses.map((r) => r.status).sort()).toEqual([
      200, 410, 410, 410, 410,
    ]);
    const joined = await db
      .select()
      .from(memberships)
      .where(eq(memberships.groupId, group.id));
    expect(joined.filter((m) => m.userId !== session.id)).toHaveLength(1);
  });
});

describe("A user who already has the access is told so", () => {
  it("BR-09 a second accept by the same user at the same time is refused", async () => {
    const { group, session } = await newMember();
    const { code } = await invite({ session }, group.id, { type: "buyer" });
    const someone = await newOnboardedUser();

    // Another accept by the same user, through another invitation, holds the
    // new membership uncommitted while this one reads none and inserts too.
    const other = await pool.connect();
    try {
      await other.query("BEGIN");
      await other.query(
        "INSERT INTO memberships (group_id, user_id, type, joined_at) VALUES ($1, $2, 'buyer', now())",
        [group.id, someone.user.id],
      );
      const accepting = acceptInvitation(
        db,
        time.clock,
        someone.user.id,
        code,
      ).catch((error: unknown) => error);
      // Wait until this accept is blocked on the other one's membership row.
      await expect
        .poll(
          async () =>
            (
              await pool.query(
                "SELECT count(*)::int AS waiting FROM pg_stat_activity WHERE wait_event_type = 'Lock' AND query LIKE 'insert into \"memberships\"%'",
              )
            ).rows[0].waiting,
        )
        .toBe(1);
      await other.query("COMMIT");

      const refusal = await accepting;
      expect(refusal).toBeInstanceOf(RuleViolationError);
      expect((refusal as RuleViolationError).reason).toBe("ALREADY_IN_GROUP");
    } finally {
      other.release();
    }
    expect(await membershipsOf(someone.user.id)).toHaveLength(1);
    const [row] = await db
      .select({ status: invitations.status })
      .from(invitations)
      .where(eq(invitations.code, code));
    expect(row?.status).toBe("pending");
  });

  it("AC-15 a member opens an invitation to their own group", async () => {
    const member = await invite({ as: "ana" }, garcia, { type: "member" });
    const buyer = await invite({ as: "ana" }, garcia, { type: "buyer" });

    for (const { id, code } of [member, buyer]) {
      const previewed = await preview(code, { as: "rosa" });
      expect(previewed.status).toBe(200);
      expect((await previewed.json()).alreadyInGroup).toBe(true);

      const accepted = await accept({ as: "rosa" }, code);
      expect(accepted.status).toBe(409);
      expect(await errorOf(accepted)).toMatchObject({
        code: "RULE_VIOLATION",
        reason: "ALREADY_IN_GROUP",
      });

      expect((await invitationRow(id)).status).toBe("pending");
      const someone = await newOnboardedUser();
      const forSomeoneElse = await preview(code, { session: someone.session });
      expect(forSomeoneElse.status).toBe(200);
      expect((await forSomeoneElse.json()).alreadyInGroup).toBe(false);
    }
    expect(await membershipsOf(seedIds.users.rosa)).toHaveLength(1);
  });

  it("BR-09 a buyer opens a buyer invitation to their own group", async () => {
    const { id, code } = await invite({ as: "ana" }, garcia, {
      type: "buyer",
    });

    const previewed = await preview(code, { as: "luis" });
    const declined = await decline({ as: "luis" }, code);

    expect((await previewed.json()).alreadyInGroup).toBe(true);
    expect(declined.status).toBe(409);
    expect((await errorOf(declined)).reason).toBe("ALREADY_IN_GROUP");
    expect((await invitationRow(id)).status).toBe("pending");
  });
});

describe("POST /invitations/by-code/{code}/decline", () => {
  it("BR-06 a new user who declines gets their own group", async () => {
    const { group, session } = await newMember();
    const { id, code } = await invite({ session }, group.id, {
      type: "member",
    });
    const invitee = await signUpThrough(code, "es");
    expect(await membershipsOf(invitee.user.id)).toEqual([]);

    const response = await decline({ session: invitee.session }, code);

    expect(response.status).toBe(204);
    expect((await invitationRow(id)).status).toBe("declined");
    expect(await membershipIn(group.id, invitee.user.id)).toBeUndefined();
    const [own] = await db
      .select()
      .from(groups)
      .where(eq(groups.ownerId, invitee.user.id));
    expect(own?.name).toBe(startingGroupName("Carlos", "es"));
    const ownLists = await db
      .select()
      .from(lists)
      .where(eq(lists.groupId, own!.id));
    expect(ownLists).toHaveLength(1);
    expect(await membershipsOf(invitee.user.id)).toMatchObject([
      { groupId: own!.id, type: "member", status: "active" },
    ]);
  });

  it("BR-08 a user with a group declines", async () => {
    const { id, code } = await invite({ as: "luis" }, perez, {
      type: "buyer",
    });
    const before = await membershipsOf(seedIds.users.rosa);

    const response = await decline({ as: "rosa" }, code);

    expect(response.status).toBe(204);
    expect((await invitationRow(id)).status).toBe("declined");
    expect(await membershipsOf(seedIds.users.rosa)).toEqual(before);
    const owned = await db
      .select()
      .from(groups)
      .where(eq(groups.ownerId, seedIds.users.rosa));
    expect(owned).toEqual([]);
  });
});

// These change seed memberships, so they run last.
describe("Accepting changes an existing membership", () => {
  it("AC-14 a buyer who accepts a member invitation becomes a member", async () => {
    const { id, code } = await invite({ as: "ana" }, garcia, {
      type: "member",
    });

    const response = await accept({ as: "juan" }, code);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ groupId: garcia, type: "member" });
    const juans = (await membershipsOf(seedIds.users.juan)).filter(
      (m) => m.groupId === garcia,
    );
    expect(juans).toHaveLength(1);
    expect(juans[0]).toMatchObject({ type: "member", status: "active" });
    expect((await invitationRow(id)).status).toBe("accepted");
  });

  it("BR-11 a person whose access ended joins again", async () => {
    const { code } = await invite({ as: "ana" }, garcia, { type: "buyer" });

    const response = await accept({ as: "pedro" }, code);

    expect(response.status).toBe(200);
    expect(await membershipIn(garcia, seedIds.users.pedro)).toMatchObject({
      type: "buyer",
      status: "active",
      endedAt: null,
      joinedAt: start,
    });
  });
});
