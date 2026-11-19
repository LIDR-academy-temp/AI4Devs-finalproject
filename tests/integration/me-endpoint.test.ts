import { afterAll, describe, expect, it } from "vitest";

import { getMe } from "../../src/app/api/v1/me/definitions";
import { seedIds } from "../../scripts/seed-data";
import { meSchema } from "../../src/server/http/schemas";
import { createRouteHandler } from "../../src/server/http/route";
import { visibleTabs } from "../../src/shared/navigation";
import { createItem, createShipment, createUser } from "../support/factories";
import {
  apiRequest,
  createTestDatabase,
  expectMatchesSchema,
  type SeedSessionUser,
  testDependencies,
} from "../support/routes";

// GET /me (docs/05-API.md, section 2), against the seed (docs/04-DATA-MODEL.md, section 3).

const { pool, db } = createTestDatabase();
afterAll(() => pool.end());
const handler = createRouteHandler(getMe, testDependencies({ db }));

const { users, groups, lists } = seedIds;

async function me(as: SeedSessionUser) {
  const response = await handler(apiRequest("/me", { as }));
  expect(response.status).toBe(200);
  const body = await response.json();
  expectMatchesSchema(meSchema, body);
  return body as ReturnType<typeof meSchema.parse>;
}

describe("GET /me", () => {
  it("AC-24 a buyer-only user's memberships give only To buy and My purchases", async () => {
    const juan = await me("juan");

    expect(juan.memberships).toEqual([
      {
        groupId: groups.garcia,
        groupName: "García Group",
        type: "buyer",
        isOwner: false,
      },
    ]);
    expect(visibleTabs(juan)).toEqual(["toBuy", "purchases"]);
  });

  it("BR-12 a user in two groups sees each membership with its role", async () => {
    const luis = await me("luis");

    expect(luis).toMatchObject({
      id: users.luis,
      name: "Luis",
      email: "luis@example.com",
      language: "es",
      whatsappNumber: "+12025550104",
      receiveEmails: true,
      onboarded: true,
    });
    expect(luis.memberships).toEqual([
      {
        groupId: groups.garcia,
        groupName: "García Group",
        type: "buyer",
        isOwner: false,
      },
      {
        groupId: groups.perez,
        groupName: "Pérez Group",
        type: "member",
        isOwner: true,
      },
    ]);
  });

  it("BR-11 an ended membership isn't returned", async () => {
    const pedro = await me("pedro");

    expect(pedro.memberships).toEqual([]);
  });

  it("BR-11 a user whose access ended keeps My purchases for what they bought", async () => {
    // Pedro's membership ended, and he still has a purchased item to ship.
    const pedro = await me("pedro");

    expect(pedro.memberships).toEqual([]);
    expect(pedro.hasPurchases).toBe(true);
    expect(visibleTabs(pedro)).toEqual(["purchases"]);
  });

  it("T-07 a request without a session is rejected", async () => {
    const response = await handler(apiRequest("/me"));

    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("NOT_SIGNED_IN");
  });

  it("T-07 a user who hasn't completed onboarding reads their state", async () => {
    const user = await createUser(db, { name: "Nueva Persona" });

    const response = await handler(
      apiRequest("/me", {
        session: { id: user.id, language: null, onboarded: false },
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expectMatchesSchema(meSchema, body);
    expect(body).toMatchObject({
      id: user.id,
      name: "Nueva Persona",
      language: null,
      whatsappNumber: null,
      onboarded: false,
      hasPurchases: false,
      memberships: [],
    });
  });

  it("FR-08 a member with a reserved item has purchases", async () => {
    expect((await me("rosa")).hasPurchases).toBe(false);
    await createItem(db, {
      listId: lists.birthday,
      addedBy: users.ana,
      status: "reserved",
      buyerId: users.rosa,
    });

    const rosa = await me("rosa");

    expect(rosa.hasPurchases).toBe(true);
    expect(visibleTabs(rosa)).toEqual([
      "lists",
      "people",
      "group",
      "purchases",
    ]);
  });

  it("FR-08 a member with only shipped or no items has no purchases", async () => {
    expect((await me("ana")).hasPurchases).toBe(false);
    const shipment = await createShipment(db, {
      groupId: groups.garcia,
      buyerId: users.ana,
    });
    await createItem(db, {
      listId: lists.birthday,
      addedBy: users.rosa,
      status: "shipped",
      buyerId: users.ana,
      shipmentId: shipment.id,
    });

    const ana = await me("ana");

    expect(ana.hasPurchases).toBe(false);
    expect(visibleTabs(ana)).toEqual(["lists", "people", "group"]);
  });
});
