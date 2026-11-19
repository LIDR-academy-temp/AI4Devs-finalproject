import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { seedIds } from "../../scripts/seed-data";
import {
  getLists,
  postList,
} from "../../src/app/api/v1/groups/[groupId]/lists/definitions";
import { createRouteHandler } from "../../src/server/http/route";
import {
  listCollectionSchema,
  listSchema,
} from "../../src/server/http/schemas";
import {
  createGroup,
  createList,
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

// GET and POST /groups/{groupId}/lists (docs/05-API.md, section 2), against
// the seed (docs/04-DATA-MODEL.md, section 3).

const { pool, db } = createTestDatabase();
afterAll(() => pool.end());
const dependencies = testDependencies({ db });
const listsHandler = createRouteHandler(getLists, dependencies);
const createHandler = createRouteHandler(postList, dependencies);

const { groups, lists } = seedIds;

let thirdGroupId: string;

beforeAll(async () => {
  const owner = await createUser(db, { name: "Third Owner" });
  const group = await createGroup(db, { ownerId: owner.id });
  await createMembership(db, { groupId: group.id, userId: owner.id });
  await createList(db, { groupId: group.id, name: "Third list" });
  thirdGroupId = group.id;
});

function getGroupLists(as: SeedSessionUser, groupId: string) {
  return listsHandler(
    apiRequest(`/groups/${groupId}/lists`, { as }),
    routeParams({ groupId }),
  );
}

function postGroupList(as: SeedSessionUser, groupId: string, body: unknown) {
  return createHandler(
    apiRequest(`/groups/${groupId}/lists`, { as, method: "POST", body }),
    routeParams({ groupId }),
  );
}

async function listNames(as: SeedSessionUser, groupId: string) {
  const response = await getGroupLists(as, groupId);
  const body = await response.json();
  return (body.lists as { name: string }[]).map((list) => list.name);
}

describe("GET /groups/{groupId}/lists", () => {
  it("BR-12 a member and a buyer see the same lists", async () => {
    const memberResponse = await getGroupLists("ana", groups.garcia);
    const buyerResponse = await getGroupLists("juan", groups.garcia);

    expect(memberResponse.status).toBe(200);
    expect(buyerResponse.status).toBe(200);
    const memberBody = await memberResponse.json();
    expectMatchesSchema(listCollectionSchema, memberBody);
    expect(await buyerResponse.json()).toEqual(memberBody);
    // The archived list, "Last Christmas", isn't returned.
    expect(memberBody).toEqual({
      lists: [
        { id: lists.birthday, name: "Anthony's birthday" },
        { id: lists.medicine, name: "Medicine" },
      ],
    });
  });

  it("AC-26 a request for another group's lists is rejected like a missing group", async () => {
    // Luis is in the García and Pérez groups, not the third.
    const third = await getGroupLists("luis", thirdGroupId);
    const missing = await getGroupLists("luis", randomUUID());

    expect(third.status).toBe(404);
    expect(missing.status).toBe(404);
    const thirdBody = await third.text();
    expect(JSON.parse(thirdBody).error.code).toBe("NOT_AVAILABLE");
    expect(thirdBody).toBe(await missing.text());
  });
});

describe("POST /groups/{groupId}/lists", () => {
  it("FR-12 a member creates a list", async () => {
    const response = await postGroupList("rosa", groups.garcia, {
      name: "  Groceries  ",
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expectMatchesSchema(listSchema, body);
    expect(body.name).toBe("Groceries");
    expect(await listNames("rosa", groups.garcia)).toContain("Groceries");
  });

  it("BR-12 a buyer can't create a list", async () => {
    const response = await postGroupList("juan", groups.garcia, {
      name: "Buyer's list",
    });

    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("FORBIDDEN");
    expect(await listNames("ana", groups.garcia)).not.toContain("Buyer's list");
  });

  it("BR-32 a list name outside the limit is refused", async () => {
    for (const [name, error] of [
      ["", "required"],
      ["   ", "required"],
      ["x".repeat(101), "too_long"],
    ] as const) {
      const response = await postGroupList("ana", groups.garcia, { name });

      expect(response.status).toBe(422);
      expect((await response.json()).error.fields).toEqual({ name: error });
    }
    expect(await listNames("ana", groups.garcia)).not.toContain(
      "x".repeat(101),
    );
  });

  it("BR-13 a member of another group can't create a list here", async () => {
    const response = await postGroupList("ana", groups.perez, {
      name: "Intruder",
    });

    expect(response.status).toBe(404);
  });
});
