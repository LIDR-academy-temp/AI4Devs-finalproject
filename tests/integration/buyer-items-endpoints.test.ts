import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { seedIds } from "../../scripts/seed-data";
import { getPurchases } from "../../src/app/api/v1/me/purchases/definitions";
import { getToBuy } from "../../src/app/api/v1/me/to-buy/definitions";
import type { Clock } from "../../src/server/clock";
import { createRouteHandler } from "../../src/server/http/route";
import { buyerItemCollectionSchema } from "../../src/server/http/schemas";
import { createItem, createList } from "../support/factories";
import {
  apiRequest,
  createTestDatabase,
  expectMatchesSchema,
  type SeedSessionUser,
  testDependencies,
} from "../support/routes";

// To buy and My purchases (docs/05-API.md, section 2; FR-21), against the
// seed (docs/04-DATA-MODEL.md, section 3): Luis is a buyer in García Group and
// a member of Pérez Group, Juan a buyer in García Group, and Pedro's
// membership in García Group ended.

const { pool, db } = createTestDatabase();
afterAll(() => pool.end());

let now = new Date("2026-11-10T12:00:00Z").getTime();
const clock: Clock = () => new Date((now += 61_000));
const dependencies = testDependencies({ db, clock });

const handlers = {
  toBuy: createRouteHandler(getToBuy, dependencies),
  purchases: createRouteHandler(getPurchases, dependencies),
};

const { users, groups, lists, recipients } = seedIds;
const seedItems = seedIds.items;

type BuyerItems = ReturnType<typeof buyerItemCollectionSchema.parse>["items"];

async function toBuyAs(
  as: SeedSessionUser,
  query: Record<string, string> = {},
) {
  const search = new URLSearchParams(query).toString();
  return handlers.toBuy(
    apiRequest(`/me/to-buy${search ? `?${search}` : ""}`, { as }),
  );
}

/** The items in a successful answer, checked against the schema. */
async function itemsOf(response: Response): Promise<BuyerItems> {
  expect(response.status).toBe(200);
  const body = await response.json();
  expectMatchesSchema(buyerItemCollectionSchema, body);
  return body.items;
}

function idsOf(items: BuyerItems) {
  return items.map(({ id }) => id).sort();
}

// A pending item in an archived list of García Group (BR-17).
let archivedItemId = "";

beforeAll(async () => {
  const archived = await createList(db, {
    groupId: groups.garcia,
    name: "Old list",
    archivedAt: new Date(),
  });
  archivedItemId = (
    await createItem(db, { listId: archived.id, addedBy: users.ana })
  ).id;
});

describe("GET /me/to-buy", () => {
  it("AC-58 To buy has the pending items with their person, list, and group", async () => {
    const items = await itemsOf(await toBuyAs("luis"));

    expect(idsOf(items)).toEqual(
      [
        seedItems.pending,
        seedItems.pendingNoRecipient,
        seedItems.perezPending,
      ].sort(),
    );
    const byId = new Map(items.map((item) => [item.id, item]));
    expect(byId.get(seedItems.pending)).toMatchObject({
      status: "pending",
      recipient: { id: recipients.anthony, name: "Anthony" },
      list: { id: lists.birthday, name: "Anthony's birthday" },
      group: { id: groups.garcia, name: "García Group" },
    });
    expect(byId.get(seedItems.pendingNoRecipient)).toMatchObject({
      recipient: null,
      list: { id: lists.medicine, name: "Medicine" },
    });
    expect(byId.get(seedItems.perezPending)).toMatchObject({
      list: { id: lists.errands, name: "Errands" },
      group: { id: groups.perez, name: "Pérez Group" },
    });
  });

  it("AC-58 To buy filtered by group and by list", async () => {
    const byGroup = await itemsOf(
      await toBuyAs("luis", { groupId: groups.perez }),
    );
    const byList = await itemsOf(
      await toBuyAs("luis", { listId: lists.medicine }),
    );
    const both = await itemsOf(
      await toBuyAs("luis", { groupId: groups.garcia, listId: lists.birthday }),
    );

    expect(idsOf(byGroup)).toEqual([seedItems.perezPending]);
    expect(idsOf(byList)).toEqual([seedItems.pendingNoRecipient]);
    expect(idsOf(both)).toEqual([seedItems.pending]);
  });

  it("FR-21 To buy leaves out other groups, other statuses, archived lists, and groups the user left", async () => {
    const juan = await itemsOf(await toBuyAs("juan"));
    const pedro = await itemsOf(await toBuyAs("pedro"));

    expect(idsOf(juan)).toEqual(
      [seedItems.pending, seedItems.pendingNoRecipient].sort(),
    );
    expect(idsOf(juan)).not.toContain(archivedItemId);
    expect(juan.every(({ status }) => status === "pending")).toBe(true);
    expect(pedro).toEqual([]);
  });

  it("BR-13 a filter for another group returns nothing", async () => {
    const otherGroup = await itemsOf(
      await toBuyAs("juan", { groupId: groups.perez }),
    );
    const notAnId = await toBuyAs("juan", { groupId: "not-an-id" });

    expect(otherGroup).toEqual([]);
    expect(notAnId.status).toBe(422);
    expect((await notAnId.json()).error).toMatchObject({
      code: "VALIDATION_FAILED",
      fields: { groupId: "invalid" },
    });
  });
});

describe("GET /me/purchases", () => {
  function purchasesAs(as: SeedSessionUser) {
    return handlers.purchases(apiRequest("/me/purchases", { as }));
  }

  it("FR-21 My purchases has the buyer's reserved and purchased items", async () => {
    const items = await itemsOf(await purchasesAs("juan"));

    expect(idsOf(items)).toEqual(
      [seedItems.reservedByJuan, seedItems.purchasedByJuan].sort(),
    );
    expect(
      items.find(({ id }) => id === seedItems.purchasedByJuan),
    ).toMatchObject({
      status: "purchased",
      buyer: { id: users.juan },
      list: { id: lists.birthday, name: "Anthony's birthday" },
      group: { id: groups.garcia, name: "García Group" },
    });
    // Luis's only item is unavailable, so he has nothing here.
    expect(await itemsOf(await purchasesAs("luis"))).toEqual([]);
  });

  it("BR-11 My purchases keeps purchased items after the user left the group", async () => {
    // A reservation left behind in the group Pedro left; leaving releases
    // reservations (BR-11), so it isn't his to act on.
    await createItem(db, {
      listId: lists.medicine,
      addedBy: users.ana,
      status: "reserved",
      buyerId: users.pedro,
      version: 2,
    });

    const items = await itemsOf(await purchasesAs("pedro"));

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: seedItems.purchasedByPedro,
      status: "purchased",
      group: { id: groups.garcia, name: "García Group" },
      list: { id: lists.medicine, name: "Medicine" },
    });
  });

  it("FR-21 a user with nothing reserved or purchased", async () => {
    expect(await itemsOf(await purchasesAs("rosa"))).toEqual([]);
  });
});
