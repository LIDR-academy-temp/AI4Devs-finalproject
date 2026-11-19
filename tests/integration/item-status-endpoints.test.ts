import { asc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { seedIds } from "../../scripts/seed-data";
import {
  getItemById,
  patchItem,
} from "../../src/app/api/v1/items/[itemId]/definitions";
import { postPurchase } from "../../src/app/api/v1/items/[itemId]/purchase/definitions";
import {
  deleteReservation,
  postReservation,
} from "../../src/app/api/v1/items/[itemId]/reservation/definitions";
import type { Clock } from "../../src/server/clock";
import { items, statusHistory } from "../../src/server/db/schema";
import { createRouteHandler } from "../../src/server/http/route";
import { itemSchema } from "../../src/server/http/schemas";
import {
  createGroup,
  createItem,
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

// Reserving, releasing, and purchasing (docs/05-API.md, sections 2 and 3;
// BR-22, BR-23, BR-26), against the seed (docs/04-DATA-MODEL.md, section 3).
// Items that change are made here, so the seed's items stay as other
// scenarios expect.

const { pool, db } = createTestDatabase();
afterAll(() => pool.end());

// Each reading moves a minute ahead, so the limit for any request never adds
// up across the tests in this file, and history rows have distinct times.
let now = new Date("2026-11-10T12:00:00Z").getTime();
const clock: Clock = () => new Date((now += 61_000));
const dependencies = testDependencies({ db, clock });

const handlers = {
  reserve: createRouteHandler(postReservation, dependencies),
  release: createRouteHandler(deleteReservation, dependencies),
  purchase: createRouteHandler(postPurchase, dependencies),
  getItem: createRouteHandler(getItemById, dependencies),
  updateItem: createRouteHandler(patchItem, dependencies),
};

const { users, lists, groups } = seedIds;

function reserveAs(as: SeedSessionUser, itemId: string) {
  return handlers.reserve(
    apiRequest(`/items/${itemId}/reservation`, { as, method: "POST" }),
    routeParams({ itemId }),
  );
}

function releaseAs(as: SeedSessionUser, itemId: string) {
  return handlers.release(
    apiRequest(`/items/${itemId}/reservation`, { as, method: "DELETE" }),
    routeParams({ itemId }),
  );
}

function purchaseAs(as: SeedSessionUser, itemId: string, body?: unknown) {
  return handlers.purchase(
    apiRequest(`/items/${itemId}/purchase`, { as, method: "POST", body }),
    routeParams({ itemId }),
  );
}

async function itemRow(itemId: string) {
  const [row] = await db.select().from(items).where(eq(items.id, itemId));
  return row;
}

async function historyOf(itemId: string) {
  return db
    .select()
    .from(statusHistory)
    .where(eq(statusHistory.itemId, itemId))
    .orderBy(asc(statusHistory.createdAt));
}

async function errorOf(response: Response) {
  return (await response.json()).error as {
    code: string;
    fields?: Record<string, string>;
  };
}

/** A pending item in the seed's birthday list, in García Group. */
function pendingItem() {
  return createItem(db, { listId: lists.birthday, addedBy: users.ana });
}

/** An item a seed user reserved (version 2, as after one status change). */
function reservedItem(
  buyer: SeedSessionUser,
  values: Partial<typeof items.$inferInsert> = {},
) {
  return createItem(db, {
    listId: lists.birthday,
    addedBy: users.ana,
    status: "reserved",
    buyerId: users[buyer],
    version: 2,
    ...values,
  });
}

// A group no seed user belongs to, and an archived list in García Group.
const outside = { itemId: "", archivedItemId: "" };

beforeAll(async () => {
  const owner = await createUser(db, { name: "Third Owner" });
  const group = await createGroup(db, { ownerId: owner.id });
  await createMembership(db, { groupId: group.id, userId: owner.id });
  const list = await createList(db, { groupId: group.id });
  outside.itemId = (
    await createItem(db, { listId: list.id, addedBy: owner.id })
  ).id;
  const archived = await createList(db, {
    groupId: groups.garcia,
    archivedAt: new Date(),
  });
  outside.archivedItemId = (
    await createItem(db, { listId: archived.id, addedBy: users.ana })
  ).id;
});

describe("POST /items/{itemId}/reservation", () => {
  it("AC-59 two buyers reserve at the same time", async () => {
    const item = await pendingItem();

    const responses = await Promise.all([
      reserveAs("juan", item.id),
      reserveAs("luis", item.id),
    ]);

    expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
    const winner = responses.find((r) => r.status === 200)!;
    const loser = responses.find((r) => r.status === 409)!;
    expect((await errorOf(loser)).code).toBe("ALREADY_RESERVED");
    const body = await winner.json();
    expectMatchesSchema(itemSchema, body);
    const row = await itemRow(item.id);
    expect(row).toMatchObject({ status: "reserved", buyerId: body.buyer.id });
    expect(
      (await historyOf(item.id)).filter((h) => h.toStatus === "reserved"),
    ).toHaveLength(1);
  });

  it("FR-24 a member reserves a pending item", async () => {
    const item = await pendingItem();

    const response = await reserveAs("ana", item.id);

    expect(response.status).toBe(200);
    const body = await response.json();
    expectMatchesSchema(itemSchema, body);
    expect(body).toMatchObject({
      id: item.id,
      status: "reserved",
      buyer: { id: users.ana, name: "Ana" },
      version: 2,
    });
  });

  it("BR-22 an item that isn't pending can't be reserved", async () => {
    const byLuis = await reservedItem("luis");
    const byJuan = await reservedItem("juan");
    const purchased = await createItem(db, {
      listId: lists.birthday,
      addedBy: users.ana,
      status: "purchased",
      buyerId: users.luis,
      version: 3,
    });

    const responses = [
      await reserveAs("juan", byLuis.id),
      await reserveAs("juan", byJuan.id),
      await reserveAs("juan", purchased.id),
    ];

    expect(responses.map((r) => r.status)).toEqual([409, 409, 409]);
    expect(
      await Promise.all(responses.map(async (r) => (await errorOf(r)).code)),
    ).toEqual(["ALREADY_RESERVED", "ITEM_CHANGED", "ITEM_CHANGED"]);
    expect(await itemRow(byLuis.id)).toMatchObject({
      buyerId: users.luis,
      version: 2,
    });
    expect(await itemRow(byJuan.id)).toMatchObject({ version: 2 });
    expect(await itemRow(purchased.id)).toMatchObject({
      status: "purchased",
      version: 3,
    });
    expect(await historyOf(byLuis.id)).toEqual([]);
  });

  it("BR-13 an item the user can't see can't be reserved", async () => {
    const deleted = await pendingItem();
    await db.delete(items).where(eq(items.id, deleted.id));
    const garciaItem = await pendingItem();

    const responses = [
      await reserveAs("juan", deleted.id),
      await reserveAs("juan", outside.archivedItemId),
      await reserveAs("juan", outside.itemId),
      // Pedro's membership in García Group ended.
      await reserveAs("pedro", garciaItem.id),
    ];

    for (const response of responses) {
      expect(response.status).toBe(404);
      expect((await errorOf(response)).code).toBe("NOT_AVAILABLE");
    }
    expect(await itemRow(garciaItem.id)).toMatchObject({ status: "pending" });
  });
});

describe("DELETE /items/{itemId}/reservation", () => {
  it("AC-60 Juan releases his reservation", async () => {
    const item = await reservedItem("juan");

    const response = await releaseAs("juan", item.id);

    expect(response.status).toBe(200);
    const body = await response.json();
    expectMatchesSchema(itemSchema, body);
    expect(body).toMatchObject({ status: "pending", buyer: null, version: 3 });
    const again = await reserveAs("luis", item.id);
    expect(again.status).toBe(200);
    expect(await again.json()).toMatchObject({
      status: "reserved",
      buyer: { id: users.luis },
    });
  });

  it("BR-12 only the item's buyer releases it", async () => {
    const reserved = await reservedItem("juan");
    const pending = await pendingItem();

    const byMember = await releaseAs("ana", reserved.id);
    const byBuyer = await releaseAs("luis", reserved.id);
    const notReserved = await releaseAs("juan", pending.id);

    expect(byMember.status).toBe(403);
    expect((await errorOf(byMember)).code).toBe("FORBIDDEN");
    expect(byBuyer.status).toBe(403);
    expect((await errorOf(byBuyer)).code).toBe("FORBIDDEN");
    expect(await itemRow(reserved.id)).toMatchObject({
      status: "reserved",
      buyerId: users.juan,
      version: 2,
    });
    expect(notReserved.status).toBe(409);
    expect((await errorOf(notReserved)).code).toBe("ITEM_CHANGED");
  });
});

describe("POST /items/{itemId}/purchase", () => {
  it("AC-61 another buyer can't mark Juan's item as purchased", async () => {
    const before = await itemRow(seedIds.items.reservedByJuan);

    const response = await purchaseAs("luis", seedIds.items.reservedByJuan, {
      buyerNote: "Got it",
    });

    expect(response.status).toBe(403);
    expect((await errorOf(response)).code).toBe("FORBIDDEN");
    expect(await itemRow(seedIds.items.reservedByJuan)).toEqual(before);
  });

  it("AC-62 the buyer marks the item as purchased with a note", async () => {
    const item = await reservedItem("juan");

    const response = await purchaseAs("juan", item.id, {
      buyerNote: "Bought the generic brand",
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expectMatchesSchema(itemSchema, body);
    expect(body).toMatchObject({
      status: "purchased",
      buyer: { id: users.juan },
      buyerNote: "Bought the generic brand",
      version: 3,
    });
    expect(await historyOf(item.id)).toMatchObject([
      { fromStatus: "reserved", toStatus: "purchased", authorId: users.juan },
    ]);
    const read = await handlers.getItem(
      apiRequest(`/items/${item.id}`, { as: "ana" }),
      routeParams({ itemId: item.id }),
    );
    expect(await read.json()).toMatchObject({
      status: "purchased",
      buyerNote: "Bought the generic brand",
    });
  });

  it("BR-25 the buyer note is optional and limited", async () => {
    const noBody = await reservedItem("juan");
    const spaces = await reservedItem("juan");
    const tooLong = await reservedItem("juan");

    const responses = [
      await purchaseAs("juan", noBody.id),
      await purchaseAs("juan", spaces.id, { buyerNote: "   " }),
      await purchaseAs("juan", tooLong.id, { buyerNote: "a".repeat(1001) }),
    ];

    expect(responses.map((r) => r.status)).toEqual([200, 200, 422]);
    expect(await itemRow(noBody.id)).toMatchObject({
      status: "purchased",
      buyerNote: null,
    });
    expect(await itemRow(spaces.id)).toMatchObject({
      status: "purchased",
      buyerNote: null,
    });
    expect(await errorOf(responses[2]!)).toMatchObject({
      code: "VALIDATION_FAILED",
      fields: { buyerNote: "too_long" },
    });
    expect(await itemRow(tooLong.id)).toMatchObject({ status: "reserved" });
  });

  it("BR-25 a purchase keeps, replaces, or clears an earlier buyer note", async () => {
    const withNote = { buyerNote: "Earlier note" };
    const kept = await reservedItem("juan", withNote);
    const replaced = await reservedItem("juan", withNote);
    const cleared = await reservedItem("juan", withNote);

    const responses = [
      await purchaseAs("juan", kept.id),
      await purchaseAs("juan", replaced.id, { buyerNote: "New note" }),
      await purchaseAs("juan", cleared.id, { buyerNote: null }),
    ];

    expect(responses.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(await itemRow(kept.id)).toMatchObject({
      status: "purchased",
      buyerNote: "Earlier note",
    });
    expect(await itemRow(replaced.id)).toMatchObject({ buyerNote: "New note" });
    expect(await itemRow(cleared.id)).toMatchObject({ buyerNote: null });
  });

  it("BR-22 an item that isn't reserved can't be marked as purchased", async () => {
    const pending = await pendingItem();
    const purchased = await reservedItem("juan");
    expect((await purchaseAs("juan", purchased.id)).status).toBe(200);

    const responses = [
      await purchaseAs("juan", pending.id),
      await purchaseAs("juan", purchased.id),
    ];

    for (const response of responses) {
      expect(response.status).toBe(409);
      expect((await errorOf(response)).code).toBe("ITEM_CHANGED");
    }
    expect(await itemRow(pending.id)).toMatchObject({ status: "pending" });
    expect(await itemRow(purchased.id)).toMatchObject({
      status: "purchased",
      version: 3,
    });
  });
});

describe("status history and versions", () => {
  it("BR-26 reserving, releasing, and purchasing are recorded", async () => {
    const item = await pendingItem();

    for (const response of [
      await reserveAs("juan", item.id),
      await releaseAs("juan", item.id),
      await reserveAs("juan", item.id),
      await purchaseAs("juan", item.id),
    ]) {
      expect(response.status).toBe(200);
    }

    const history = await historyOf(item.id);
    expect(
      history.map(({ fromStatus, toStatus, authorId }) => ({
        fromStatus,
        toStatus,
        authorId,
      })),
    ).toEqual([
      { fromStatus: "pending", toStatus: "reserved", authorId: users.juan },
      { fromStatus: "reserved", toStatus: "pending", authorId: users.juan },
      { fromStatus: "pending", toStatus: "reserved", authorId: users.juan },
      { fromStatus: "reserved", toStatus: "purchased", authorId: users.juan },
    ]);
    expect(await itemRow(item.id)).toMatchObject({ version: 5 });
  });

  it("BR-19 reserving and releasing clear the Updated marker", async () => {
    const updated = { updatedAfterReservation: true };
    const pending = await createItem(db, {
      listId: lists.birthday,
      addedBy: users.ana,
      ...updated,
    });
    const released = await reservedItem("juan", {
      ...updated,
      buyerNote: "Earlier note",
    });
    const purchased = await reservedItem("juan", updated);

    expect((await reserveAs("luis", pending.id)).status).toBe(200);
    expect((await releaseAs("juan", released.id)).status).toBe(200);
    expect((await purchaseAs("juan", purchased.id)).status).toBe(200);

    expect(await itemRow(pending.id)).toMatchObject({
      updatedAfterReservation: false,
    });
    expect(await itemRow(released.id)).toMatchObject({
      status: "pending",
      buyerNote: null,
      updatedAfterReservation: false,
    });
    expect(await itemRow(purchased.id)).toMatchObject({
      status: "purchased",
      updatedAfterReservation: true,
    });
  });

  it("BR-20 a member's edit from before a reservation is refused", async () => {
    const item = await pendingItem();
    expect((await reserveAs("juan", item.id)).status).toBe(200);

    const response = await handlers.updateItem(
      apiRequest(`/items/${item.id}`, {
        as: "ana",
        method: "PATCH",
        body: { version: 1, name: "Renamed" },
      }),
      routeParams({ itemId: item.id }),
    );

    expect(response.status).toBe(409);
    expect((await errorOf(response)).code).toBe("ITEM_CHANGED");
    expect(await itemRow(item.id)).toMatchObject({ name: "Test item" });
  });
});
