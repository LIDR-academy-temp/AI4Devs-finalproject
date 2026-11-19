import { randomUUID } from "node:crypto";

import { asc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { seedIds } from "../../scripts/seed-data";
import { postList } from "../../src/app/api/v1/groups/[groupId]/lists/definitions";
import {
  deleteItemById,
  getItemById,
  patchItem,
} from "../../src/app/api/v1/items/[itemId]/definitions";
import {
  getListItems,
  postListItem,
} from "../../src/app/api/v1/lists/[listId]/items/definitions";
import type { Clock } from "../../src/server/clock";
import { items, statusHistory } from "../../src/server/db/schema";
import { createRouteHandler } from "../../src/server/http/route";
import {
  itemCollectionSchema,
  itemSchema,
} from "../../src/server/http/schemas";
import {
  createGroup,
  createItem,
  createList,
  createMembership,
  createRecipient,
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

// The list and item endpoints (docs/05-API.md, sections 2 and 3), against the
// seed (docs/04-DATA-MODEL.md, section 3).

const { pool, db } = createTestDatabase();
afterAll(() => pool.end());

// Each reading moves a minute ahead, so the limit for any request (120 per
// minute) never adds up across the tests in this file.
let now = new Date("2026-11-10T12:00:00Z").getTime();
const clock: Clock = () => new Date((now += 61_000));
const dependencies = testDependencies({ db, clock });

const handlers = {
  listItems: createRouteHandler(getListItems, dependencies),
  createItem: createRouteHandler(postListItem, dependencies),
  getItem: createRouteHandler(getItemById, dependencies),
  updateItem: createRouteHandler(patchItem, dependencies),
  deleteItem: createRouteHandler(deleteItemById, dependencies),
  createList: createRouteHandler(postList, dependencies),
};

const { users, groups, lists, recipients } = seedIds;
const seedItems = seedIds.items;

type ItemBody = ReturnType<typeof itemSchema.parse>;

function getListItemsAs(
  as: SeedSessionUser,
  listId: string,
  query: Record<string, string> = {},
) {
  const search = new URLSearchParams(query).toString();
  return handlers.listItems(
    apiRequest(`/lists/${listId}/items${search ? `?${search}` : ""}`, { as }),
    routeParams({ listId }),
  );
}

function createItemAs(as: SeedSessionUser, listId: string, body: unknown) {
  return handlers.createItem(
    apiRequest(`/lists/${listId}/items`, { as, method: "POST", body }),
    routeParams({ listId }),
  );
}

function getItemAs(as: SeedSessionUser, itemId: string) {
  return handlers.getItem(
    apiRequest(`/items/${itemId}`, { as }),
    routeParams({ itemId }),
  );
}

function updateItemAs(as: SeedSessionUser, itemId: string, body: unknown) {
  return handlers.updateItem(
    apiRequest(`/items/${itemId}`, { as, method: "PATCH", body }),
    routeParams({ itemId }),
  );
}

function deleteItemAs(as: SeedSessionUser, itemId: string) {
  return handlers.deleteItem(
    apiRequest(`/items/${itemId}`, { as, method: "DELETE" }),
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

async function itemCount() {
  return (await db.select({ id: items.id }).from(items)).length;
}

async function errorOf(response: Response) {
  return (await response.json()).error as {
    code: string;
    fields?: Record<string, string>;
  };
}

/** A pending item in the birthday list, for tests that change it. */
async function pendingItem(values: Partial<typeof items.$inferInsert> = {}) {
  return createItem(db, {
    listId: lists.birthday,
    addedBy: users.ana,
    ...values,
  });
}

// A group no seed user belongs to, with a list and an item.
const third = { listId: "", itemId: "" };

beforeAll(async () => {
  const owner = await createUser(db, { name: "Third Owner" });
  const group = await createGroup(db, { ownerId: owner.id });
  await createMembership(db, { groupId: group.id, userId: owner.id });
  const list = await createList(db, { groupId: group.id });
  const item = await createItem(db, { listId: list.id, addedBy: owner.id });
  third.listId = list.id;
  third.itemId = item.id;
});

describe("POST /lists/{listId}/items", () => {
  it("AC-38 a member types only a name and saves", async () => {
    const response = await createItemAs("ana", lists.birthday, {
      name: "Crayons",
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expectMatchesSchema(itemSchema, body);
    expect(body).toMatchObject({
      listId: lists.birthday,
      name: "Crayons",
      status: "pending",
      quantity: 1,
      recipient: null,
      url: null,
      notes: null,
      buyer: null,
      linkStatus: "none",
      updatedAfterReservation: false,
      version: 1,
    });
  });

  it("FR-13 a member creates an item with every field", async () => {
    const response = await createItemAs("rosa", lists.birthday, {
      name: "Sports shoes",
      recipientId: recipients.anthony,
      url: "https://store.example.com/shoes/123",
      quantity: 2,
      notes: "In white, no laces",
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      name: "Sports shoes",
      recipient: { id: recipients.anthony, name: "Anthony" },
      url: "https://store.example.com/shoes/123",
      quantity: 2,
      notes: "In white, no laces",
    });
  });

  it("FR-13 a recipient from another group is refused", async () => {
    const otherGroupsRecipient = await createRecipient(db, {
      groupId: groups.perez,
    });
    const before = await itemCount();

    for (const recipientId of [otherGroupsRecipient.id, randomUUID()]) {
      const response = await createItemAs("ana", lists.birthday, {
        name: "Gift",
        recipientId,
      });

      expect(response.status).toBe(422);
      expect((await errorOf(response)).fields).toEqual({
        recipientId: "invalid",
      });
    }
    expect(await itemCount()).toBe(before);
  });

  it("BR-26 creating an item records its creation", async () => {
    const response = await createItemAs("rosa", lists.medicine, {
      name: "Aspirin",
    });
    const body: ItemBody = await response.json();

    expect(await historyOf(body.id)).toEqual([
      expect.objectContaining({
        fromStatus: null,
        toStatus: "pending",
        isUndo: false,
        authorId: users.rosa,
        createdAt: new Date(body.createdAt),
      }),
    ]);
  });

  it("AC-40 a member saves with an empty name", async () => {
    const before = await itemCount();

    for (const body of [{ name: "" }, { name: "   " }, {}]) {
      const response = await createItemAs("ana", lists.birthday, body);

      expect(response.status).toBe(422);
      expect((await errorOf(response)).fields).toEqual({ name: "required" });
    }
    expect(await itemCount()).toBe(before);
  });

  it("AC-41 a name longer than 100 characters, or a quantity of 0 or 100, is refused", async () => {
    const before = await itemCount();
    const cases = [
      [{ name: "x".repeat(101) }, { name: "too_long" }],
      [{ name: "Socks", quantity: 0 }, { quantity: "too_small" }],
      [{ name: "Socks", quantity: 100 }, { quantity: "too_big" }],
    ] as const;

    for (const [body, fields] of cases) {
      const response = await createItemAs("ana", lists.birthday, body);

      expect(response.status).toBe(422);
      expect((await errorOf(response)).fields).toEqual(fields);
    }
    expect(await itemCount()).toBe(before);
  });

  it("AC-45 a link that isn't an http or https URL is refused", async () => {
    const before = await itemCount();

    for (const url of ["not a link", "ftp://store.example.com/x", "store"]) {
      const response = await createItemAs("ana", lists.birthday, {
        name: "Shoes",
        url,
      });

      expect(response.status).toBe(422);
      expect((await errorOf(response)).fields).toEqual({ url: "invalid" });
    }
    expect(await itemCount()).toBe(before);
  });

  it("BR-12 a buyer can't create an item", async () => {
    const before = await itemCount();

    const response = await createItemAs("juan", lists.birthday, {
      name: "Buyer's idea",
    });

    expect(response.status).toBe(403);
    expect(await itemCount()).toBe(before);
  });
});

describe("GET /lists/{listId}/items and GET /items/{itemId}", () => {
  it("BR-12 a buyer reads a list's items and an item", async () => {
    const listResponse = await getListItemsAs("juan", lists.birthday);

    expect(listResponse.status).toBe(200);
    const list = await listResponse.json();
    expectMatchesSchema(itemCollectionSchema, list);
    expect((list.items as ItemBody[]).map((item) => item.id)).toContain(
      seedItems.reservedByJuan,
    );

    const itemResponse = await getItemAs("juan", seedItems.reservedByJuan);

    expect(itemResponse.status).toBe(200);
    const item = await itemResponse.json();
    expectMatchesSchema(itemSchema, item);
    expect(item).toMatchObject({
      status: "reserved",
      recipient: { id: recipients.anthony, name: "Anthony" },
      buyer: { id: users.juan, name: "Juan" },
      notes: "Size 4, blue if possible",
    });
  });

  it("FR-11 items are filtered by recipient and by status", async () => {
    const ids = async (query: Record<string, string>) => {
      const response = await getListItemsAs("ana", lists.medicine, query);
      expect(response.status).toBe(200);
      const body = await response.json();
      return (body.items as ItemBody[]).map((item) => item.id);
    };

    // Medicine: Ibuprofen for Grandma (unavailable), Vitamins for Mom
    // (purchased), and Bandages with no recipient (pending).
    expect(await ids({ recipientId: recipients.grandma })).toEqual([
      seedItems.unavailable,
    ]);
    expect(await ids({ recipientId: "none" })).toContain(
      seedItems.pendingNoRecipient,
    );
    expect(await ids({ recipientId: "none" })).not.toContain(
      seedItems.unavailable,
    );
    expect(await ids({ status: "purchased" })).toEqual([
      seedItems.purchasedByPedro,
    ]);
    expect(
      await ids({ recipientId: recipients.mom, status: "pending" }),
    ).toEqual([]);

    const invalid = await getListItemsAs("ana", lists.medicine, {
      status: "lost",
    });
    expect(invalid.status).toBe(422);
  });

  it("AC-25 a buyer of one group opens an item from another group", async () => {
    // Juan buys for the García Group; the coffee belongs to the Pérez Group.
    const otherGroup = await getItemAs("juan", seedItems.perezPending);
    const missing = await getItemAs("juan", randomUUID());

    expect(otherGroup.status).toBe(404);
    const body = await otherGroup.text();
    expect(JSON.parse(body).error.code).toBe("NOT_AVAILABLE");
    expect(body).toBe(await missing.text());
  });

  it("AC-26 a request for another group's list items or items is rejected", async () => {
    // Luis is in the García and Pérez groups, not the third.
    const responses = [
      await getListItemsAs("luis", third.listId),
      await getListItemsAs("luis", randomUUID()),
      await getItemAs("luis", third.itemId),
      await getItemAs("luis", randomUUID()),
    ];

    expect(responses.map((response) => response.status)).toEqual([
      404, 404, 404, 404,
    ]);
    const bodies = await Promise.all(responses.map((r) => r.text()));
    expect(new Set(bodies).size).toBe(1);
  });

  it("AC-27 a deleted item isn't available", async () => {
    const item = await pendingItem();
    expect((await deleteItemAs("ana", item.id)).status).toBe(204);

    const response = await getItemAs("rosa", item.id);

    expect(response.status).toBe(404);
    expect((await errorOf(response)).code).toBe("NOT_AVAILABLE");
  });

  it("BR-13 an archived list and its items aren't available", async () => {
    const archivedItem = await createItem(db, {
      listId: lists.archived,
      addedBy: users.ana,
    });

    const responses = [
      await getListItemsAs("ana", lists.archived),
      await getItemAs("ana", archivedItem.id),
      await createItemAs("ana", lists.archived, { name: "Late gift" }),
      await updateItemAs("ana", archivedItem.id, { version: 1, name: "X" }),
      await deleteItemAs("ana", archivedItem.id),
    ];

    expect(responses.map((response) => response.status)).toEqual([
      404, 404, 404, 404, 404,
    ]);
    expect(await itemRow(archivedItem.id)).toBeDefined();
  });
});

describe("PATCH /items/{itemId}", () => {
  it("BR-20 an edit with a stale version is refused", async () => {
    const item = await pendingItem({ name: "Kite" });
    expect(
      (await updateItemAs("rosa", item.id, { version: 1, name: "Red kite" }))
        .status,
    ).toBe(200);

    const response = await updateItemAs("ana", item.id, {
      version: 1,
      name: "Blue kite",
    });

    expect(response.status).toBe(409);
    expect((await errorOf(response)).code).toBe("ITEM_CHANGED");
    expect(await itemRow(item.id)).toMatchObject({
      name: "Red kite",
      version: 2,
    });
  });

  it("BR-20 two simultaneous edits from the same version", async () => {
    const item = await pendingItem({ name: "Ball" });

    const responses = await Promise.all([
      updateItemAs("ana", item.id, { version: 1, name: "Ana's ball" }),
      updateItemAs("rosa", item.id, { version: 1, name: "Rosa's ball" }),
    ]);

    expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
    expect((await itemRow(item.id))?.version).toBe(2);
  });

  it("AC-50 a member edits an unavailable item", async () => {
    const response = await updateItemAs("rosa", seedItems.unavailable, {
      version: 3,
      notes: "Any brand is fine",
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expectMatchesSchema(itemSchema, body);
    expect(body).toMatchObject({
      status: "pending",
      buyer: null,
      notes: "Any brand is fine",
      version: 4,
    });
    expect(await itemRow(seedItems.unavailable)).toMatchObject({
      buyerId: null,
      unavailableNote: null,
    });
    const history = await historyOf(seedItems.unavailable);
    expect(history.at(-1)).toMatchObject({
      fromStatus: "unavailable",
      toStatus: "pending",
      authorId: users.rosa,
    });
  });

  it("BR-19 editing a reserved item keeps the reservation", async () => {
    const response = await updateItemAs("ana", seedItems.reservedByJuan, {
      version: 2,
      notes: "Size 4, any color",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "reserved",
      buyer: { id: users.juan, name: "Juan" },
      notes: "Size 4, any color",
      updatedAfterReservation: true,
    });
    // An edit isn't a status change, so nothing is added to the history.
    expect(
      (await historyOf(seedItems.reservedByJuan)).map((row) => row.toStatus),
    ).toEqual(["pending", "reserved"]);
  });

  it("BR-19 a purchased or shipped item can't be edited", async () => {
    for (const [itemId, version] of [
      [seedItems.purchasedByJuan, 3],
      [seedItems.shippedFirst, 4],
    ] as const) {
      const before = await itemRow(itemId);

      const response = await updateItemAs("ana", itemId, {
        version,
        name: "Changed",
      });

      expect(response.status).toBe(409);
      expect((await errorOf(response)).code).toBe("ITEM_CHANGED");
      expect(await itemRow(itemId)).toEqual(before);
    }
  });

  it("AC-39 a member creates a list and moves an item to it", async () => {
    const group = await createGroup(db, { ownerId: users.ana });
    await createMembership(db, { groupId: group.id, userId: users.ana });
    const birthday = await createList(db, {
      groupId: group.id,
      name: "Birthday",
    });
    const item = await createItem(db, {
      listId: birthday.id,
      addedBy: users.ana,
    });

    const created = await handlers.createList(
      apiRequest(`/groups/${group.id}/lists`, {
        as: "ana",
        method: "POST",
        body: { name: "Medicine" },
      }),
      routeParams({ groupId: group.id }),
    );
    const medicine = await created.json();
    const moved = await updateItemAs("ana", item.id, {
      version: 1,
      listId: medicine.id,
    });

    expect(moved.status).toBe(200);
    const inMedicine = await (await getListItemsAs("ana", medicine.id)).json();
    const inBirthday = await (await getListItemsAs("ana", birthday.id)).json();
    expect((inMedicine.items as ItemBody[]).map((i) => i.id)).toEqual([
      item.id,
    ]);
    expect(inBirthday.items).toEqual([]);
  });

  it("FR-16 an item can't move to another group's or an archived list", async () => {
    const item = await pendingItem();

    for (const listId of [lists.errands, lists.archived, randomUUID()]) {
      const response = await updateItemAs("ana", item.id, {
        version: 1,
        listId,
      });

      expect(response.status).toBe(422);
      expect((await errorOf(response)).fields).toEqual({ listId: "invalid" });
    }
    expect(await itemRow(item.id)).toMatchObject({
      listId: lists.birthday,
      version: 1,
    });
  });

  it("BR-32 an edit outside the limits is refused", async () => {
    const item = await pendingItem({ name: "Puzzle" });
    const cases = [
      [{ name: "" }, { name: "required" }],
      [{ quantity: 100 }, { quantity: "too_big" }],
      [{ url: "javascript:alert(1)" }, { url: "invalid" }],
      [{ notes: "x".repeat(1001) }, { notes: "too_long" }],
      [{}, { body: "invalid" }],
      [{ name: "Puzzle 2" }, { version: "required" }],
    ] as const;

    for (const [change, fields] of cases) {
      const body = "version" in fields ? change : { version: 1, ...change };
      const response = await updateItemAs("ana", item.id, body);

      expect(response.status).toBe(422);
      expect((await errorOf(response)).fields).toEqual(fields);
    }
    expect(await itemRow(item.id)).toMatchObject({
      name: "Puzzle",
      version: 1,
    });
  });

  it("BR-19 a member clears optional fields with null", async () => {
    const item = await pendingItem({
      recipientId: recipients.anthony,
      url: "https://store.example.com/x",
      notes: "Old notes",
    });

    const response = await updateItemAs("ana", item.id, {
      version: 1,
      recipientId: null,
      url: null,
      notes: "   ",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      recipient: null,
      url: null,
      notes: null,
    });
  });

  it("BR-21 changing the link drops what was looked up for the old one", async () => {
    const item = await pendingItem({
      url: "https://store.example.com/old",
      storeName: "Old store",
      thumbnailUrl: "https://blob.example.com/old.webp",
      linkStatus: "done",
    });

    const response = await updateItemAs("ana", item.id, {
      version: 1,
      url: "https://store.example.com/new",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      url: "https://store.example.com/new",
      storeName: null,
      thumbnailUrl: null,
      linkStatus: "none",
    });
  });

  it("BR-21 sending the same link again keeps what was looked up", async () => {
    const item = await pendingItem({
      url: "https://store.example.com/same",
      storeName: "Same store",
      thumbnailUrl: "https://blob.example.com/same.webp",
      linkStatus: "done",
    });

    const response = await updateItemAs("ana", item.id, {
      version: 1,
      name: "Renamed",
      url: "https://store.example.com/same",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      name: "Renamed",
      storeName: "Same store",
      thumbnailUrl: "https://blob.example.com/same.webp",
      linkStatus: "done",
    });
  });

  it("AC-51 a buyer's request to edit or delete an item is rejected", async () => {
    const before = await itemRow(seedItems.pending);

    const edit = await updateItemAs("juan", seedItems.pending, {
      version: 1,
      name: "Changed by a buyer",
    });
    const remove = await deleteItemAs("juan", seedItems.pending);

    expect(edit.status).toBe(403);
    expect(remove.status).toBe(403);
    expect((await errorOf(edit)).code).toBe("FORBIDDEN");
    expect(await itemRow(seedItems.pending)).toEqual(before);
  });
});

describe("DELETE /items/{itemId}", () => {
  it("BR-19 a member deletes a pending item and an unavailable item", async () => {
    const pending = await pendingItem();
    const unavailable = await pendingItem({
      status: "unavailable",
      buyerId: users.juan,
      unavailableNote: "Sold out",
    });
    await db.insert(statusHistory).values({
      itemId: unavailable.id,
      toStatus: "pending",
      authorId: users.ana,
    });

    for (const item of [pending, unavailable]) {
      const response = await deleteItemAs("rosa", item.id);

      expect(response.status).toBe(204);
      expect(await itemRow(item.id)).toBeUndefined();
      expect(await historyOf(item.id)).toEqual([]);
    }
  });

  it("AC-47 a reserved item can't be deleted", async () => {
    const response = await deleteItemAs("ana", seedItems.reservedByJuan);

    expect(response.status).toBe(409);
    expect((await errorOf(response)).code).toBe("ITEM_CHANGED");
    expect((await itemRow(seedItems.reservedByJuan))?.status).toBe("reserved");
  });

  it("AC-48 a purchased item can't be deleted", async () => {
    const response = await deleteItemAs("ana", seedItems.purchasedByJuan);

    expect(response.status).toBe(409);
    expect((await errorOf(response)).code).toBe("ITEM_CHANGED");
    expect((await itemRow(seedItems.purchasedByJuan))?.status).toBe(
      "purchased",
    );
  });

  it("BR-13 deleting a missing item isn't available", async () => {
    const response = await deleteItemAs("ana", randomUUID());

    expect(response.status).toBe(404);
  });
});
