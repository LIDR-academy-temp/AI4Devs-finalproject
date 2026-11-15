import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { seedIds } from "../../scripts/seed-data";
import { getGroupById } from "../../src/app/api/v1/groups/[groupId]/definitions";
import { getGroups } from "../../src/app/api/v1/groups/definitions";
import en from "../../src/i18n/en.json";
import { createRouteHandler } from "../../src/server/http/route";
import { groupListSchema, groupSchema } from "../../src/server/http/schemas";
import {
  createGroup,
  createMembership,
  createUser,
} from "../support/factories";
import {
  apiRequest,
  createTestDatabase,
  expectMatchesSchema,
  routeParams,
  type SeedSessionUser,
  testDependencies,
} from "../support/routes";

// GET /groups and GET /groups/{groupId} (docs/05-API.md, section 2), and the
// permission cases across groups, against the seed (docs/04-DATA-MODEL.md, section 3).

const { pool, db } = createTestDatabase();
afterAll(() => pool.end());
const dependencies = testDependencies({ db });
const listHandler = createRouteHandler(getGroups, dependencies);
const groupHandler = createRouteHandler(getGroupById, dependencies);

const { users, groups } = seedIds;

/** A group no seed user belongs to. */
let thirdGroupId: string;

beforeAll(async () => {
  const owner = await createUser(db, { name: "Third Owner" });
  const group = await createGroup(db, { ownerId: owner.id, name: "Third" });
  await createMembership(db, { groupId: group.id, userId: owner.id });
  thirdGroupId = group.id;
});

function requestGroup(as: SeedSessionUser, groupId: string) {
  return groupHandler(
    apiRequest(`/groups/${groupId}`, { as }),
    routeParams({ groupId }),
  );
}

describe("GET /groups", () => {
  it("AC-26 a user in two groups lists only those two", async () => {
    const response = await listHandler(apiRequest("/groups", { as: "luis" }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expectMatchesSchema(groupListSchema, body);
    expect(body).toEqual({
      groups: [
        {
          id: groups.garcia,
          name: "García Group",
          type: "buyer",
          isOwner: false,
        },
        {
          id: groups.perez,
          name: "Pérez Group",
          type: "member",
          isOwner: true,
        },
      ],
    });
    expect(JSON.stringify(body)).not.toContain(thirdGroupId);
  });

  it("BR-11 a group whose membership ended isn't listed", async () => {
    const response = await listHandler(apiRequest("/groups", { as: "pedro" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ groups: [] });
  });

  it("T-07 a request without a session is rejected", async () => {
    const response = await listHandler(apiRequest("/groups"));

    expect(response.status).toBe(401);
  });
});

describe("GET /groups/{groupId}", () => {
  it("BR-12 a member sees the group's members and buyers", async () => {
    const response = await requestGroup("rosa", groups.garcia);

    expect(response.status).toBe(200);
    const body = await response.json();
    expectMatchesSchema(groupSchema, body);
    // Pedro, the former buyer, isn't listed.
    expect(body).toEqual({
      id: groups.garcia,
      name: "García Group",
      members: [
        {
          id: users.ana,
          name: "Ana",
          isOwner: true,
          email: "ana@example.com",
        },
        {
          id: users.rosa,
          name: "Rosa",
          isOwner: false,
          email: "rosa@example.com",
        },
      ],
      buyers: [
        { id: users.juan, name: "Juan", whatsappNumber: "+12025550103" },
        { id: users.luis, name: "Luis", whatsappNumber: "+12025550104" },
      ],
    });
  });

  it("FR-07 a member sees members' emails and buyers' WhatsApp numbers", async () => {
    const response = await requestGroup("ana", groups.garcia);

    expect(response.status).toBe(200);
    const body = await response.json();
    expectMatchesSchema(groupSchema, body);
    for (const member of body.members) {
      expect(member.email).toMatch(/@example\.com$/);
      expect(member).not.toHaveProperty("whatsappNumber");
    }
    for (const buyer of body.buyers) {
      expect(buyer.whatsappNumber).toMatch(/^\+\d+$/);
      expect(buyer).not.toHaveProperty("email");
    }
  });

  it("AC-102 a buyer's request for the group has no contact details", async () => {
    const response = await requestGroup("juan", groups.garcia);

    expect(response.status).toBe(403);
    const text = await response.text();
    expect(JSON.parse(text).error.code).toBe("FORBIDDEN");
    for (const name of ["ana", "rosa", "juan", "luis"]) {
      expect(text).not.toContain(`${name}@example.com`);
    }
    for (const row of [1, 2, 3, 4, 5]) {
      expect(text).not.toContain(`202555010${row}`);
    }
  });

  it("BR-12 a buyer can't view the group's people", async () => {
    const response = await requestGroup("juan", groups.garcia);

    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("FORBIDDEN");
  });

  it("AC-26 a request for a group the user doesn't belong to is rejected like a missing one", async () => {
    // Luis is in the García and Pérez groups, not the third.
    const responses = await Promise.all(
      [thirdGroupId, randomUUID(), "not-a-uuid"].map((groupId) =>
        requestGroup("luis", groupId),
      ),
    );

    const bodies = await Promise.all(
      responses.map((response) => response.text()),
    );
    expect(responses.map((response) => response.status)).toEqual([
      404, 404, 404,
    ]);
    expect(JSON.parse(bodies[0]!).error.code).toBe("NOT_AVAILABLE");
    expect(new Set(bodies).size).toBe(1);
    expect(
      new Set(
        responses.map((response) =>
          JSON.stringify([...response.headers.entries()]),
        ),
      ).size,
    ).toBe(1);
  });

  it("BR-13 a former buyer can't view the group", async () => {
    const response = await requestGroup("pedro", groups.garcia);

    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("NOT_AVAILABLE");
  });

  it("BR-05 only a deleted account is named 'Former user'", async () => {
    const group = await createGroup(db, { ownerId: users.ana, name: "Mixed" });
    await createMembership(db, { groupId: group.id, userId: users.ana });
    // Deleted, though its name wasn't erased yet: still "Former user".
    const deletedWithName = await createUser(db, {
      name: "Old Name",
      deletedAt: new Date("2026-02-01T00:00:00Z"),
    });
    // A live account whose provider gave no name.
    const liveWithoutName = await createUser(db, {
      name: null,
      email: "nina.ortiz@example.com",
    });
    for (const [index, user] of [deletedWithName, liveWithoutName].entries()) {
      await createMembership(db, {
        groupId: group.id,
        userId: user.id,
        type: "buyer",
        joinedAt: new Date(`2026-01-1${index + 5}T00:00:00Z`),
      });
    }

    const response = await requestGroup("ana", group.id);

    expect(response.status).toBe(200);
    expect((await response.json()).buyers).toEqual([
      {
        id: deletedWithName.id,
        name: en.people.formerUser,
        whatsappNumber: null,
      },
      { id: liveWithoutName.id, name: "nina.ortiz", whatsappNumber: null },
    ]);
  });

  it("BR-05 a deleted user in a group is named 'Former user'", async () => {
    const group = await createGroup(db, { ownerId: users.ana, name: "Old" });
    await createMembership(db, { groupId: group.id, userId: users.ana });
    const deleted = await createUser(db, {
      name: null,
      email: null,
      deletedAt: new Date("2026-02-01T00:00:00Z"),
    });
    await createMembership(db, {
      groupId: group.id,
      userId: deleted.id,
      type: "buyer",
      joinedAt: new Date("2026-01-15T00:00:00Z"),
    });

    const response = await requestGroup("ana", group.id);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.buyers).toEqual([
      { id: deleted.id, name: en.people.formerUser, whatsappNumber: null },
    ]);
  });

  it("BR-05 a deleted account shows no contact details", async () => {
    const group = await createGroup(db, { ownerId: users.ana, name: "Gone" });
    await createMembership(db, { groupId: group.id, userId: users.ana });
    const deletedAt = new Date("2026-02-01T00:00:00Z");
    const member = await createUser(db, {
      name: "Gone Member",
      email: "gone.member@example.com",
      deletedAt,
    });
    const buyer = await createUser(db, {
      name: "Gone Buyer",
      whatsappNumber: "+12025550199",
      deletedAt,
    });
    await createMembership(db, { groupId: group.id, userId: member.id });
    await createMembership(db, {
      groupId: group.id,
      userId: buyer.id,
      type: "buyer",
    });

    const response = await requestGroup("ana", group.id);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.members).toContainEqual({
      id: member.id,
      name: en.people.formerUser,
      isOwner: false,
      email: null,
    });
    expect(body.buyers).toEqual([
      { id: buyer.id, name: en.people.formerUser, whatsappNumber: null },
    ]);
  });
});

describe("T-07 permission tests across two groups using the seed data", () => {
  type Case = "garcia" | "perez" | "third" | "missing" | "malformed";
  const expected: Record<SeedSessionUser, Record<Case, number>> = {
    ana: { garcia: 200, perez: 404, third: 404, missing: 404, malformed: 404 },
    rosa: { garcia: 200, perez: 404, third: 404, missing: 404, malformed: 404 },
    juan: { garcia: 403, perez: 404, third: 404, missing: 404, malformed: 404 },
    luis: { garcia: 403, perez: 200, third: 404, missing: 404, malformed: 404 },
    pedro: {
      garcia: 404,
      perez: 404,
      third: 404,
      missing: 404,
      malformed: 404,
    },
  };
  const missingId = randomUUID();
  const groupIds: Record<Case, () => string> = {
    garcia: () => groups.garcia,
    perez: () => groups.perez,
    third: () => thirdGroupId,
    missing: () => missingId,
    malformed: () => "not-a-uuid",
  };

  for (const [user, cases] of Object.entries(expected)) {
    for (const [groupCase, status] of Object.entries(cases)) {
      it(`T-07 ${user} requesting the ${groupCase} group gets ${status}`, async () => {
        const response = await requestGroup(
          user as SeedSessionUser,
          groupIds[groupCase as Case](),
        );

        expect(response.status).toBe(status);
        const body = await response.json();
        if (status === 200) expectMatchesSchema(groupSchema, body);
        else
          expect(body.error.code).toBe(
            status === 403 ? "FORBIDDEN" : "NOT_AVAILABLE",
          );
      });
    }
  }
});
