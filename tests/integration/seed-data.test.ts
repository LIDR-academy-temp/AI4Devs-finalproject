import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { isValidPhoneNumber } from "libphonenumber-js";
import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { loadSeedData, seedIds } from "../../scripts/seed-data";
import * as schema from "../../src/server/db/schema";
import {
  createGroup,
  createUser,
  expectRejected,
  PostgresError,
} from "../support/factories";
import {
  dumpDatabase,
  emptyDatabase,
  resetDatabase,
} from "../support/reset-database";

// Verifies the data in docs/04-DATA-MODEL.md, section 3.

const client = new Client({ connectionString: process.env.DATABASE_URL });
const db = drizzle(client, { schema });

const {
  deliveryAddresses,
  groups,
  invitations,
  items,
  lists,
  memberships,
  recipientDetails,
  recipients,
  shipments,
  statusHistory,
  users,
} = schema;

beforeAll(() => client.connect());
afterAll(() => client.end());

describe("Seed contents", () => {
  beforeEach(resetDatabase);

  it("the seed loads into an empty database", async () => {
    await emptyDatabase(client);
    const empty = await dumpDatabase(client);
    expect(Object.values(empty).flat()).toEqual([]);

    await loadSeedData(db);

    const seeded = await dumpDatabase(client);
    expect(
      Object.fromEntries(
        Object.entries(seeded).map(([table, rows]) => [table, rows.length]),
      ),
    ).toEqual({
      users: 5,
      accounts: 0,
      sessions: 0,
      verifications: 0,
      groups: 2,
      memberships: 6,
      invitations: 5,
      recipients: 3,
      recipient_details: 3,
      lists: 4,
      delivery_addresses: 2,
      shipments: 1,
      items: 9,
      status_history: 22,
      job_runs: 0,
      rate_limits: 0,
    });
  });

  it("has the people and their access to the García Group", async () => {
    const rows = await db
      .select({
        name: users.name,
        language: users.language,
        type: memberships.type,
        status: memberships.status,
      })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(eq(memberships.groupId, seedIds.groups.garcia));

    expect(rows).toEqual(
      expect.arrayContaining([
        { name: "Ana", language: "en", type: "member", status: "active" },
        { name: "Rosa", language: "es", type: "member", status: "active" },
        { name: "Juan", language: "es", type: "buyer", status: "active" },
        { name: "Luis", language: "es", type: "buyer", status: "active" },
        { name: "Pedro", language: "es", type: "buyer", status: "ended" },
      ]),
    );
    expect(rows).toHaveLength(5);

    const [garcia] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, seedIds.groups.garcia));
    expect(garcia).toMatchObject({
      name: "García Group",
      ownerId: seedIds.users.ana,
    });
  });

  it("has the recipients and their details", async () => {
    const rows = await db
      .select({
        recipient: recipients.name,
        name: recipientDetails.name,
        value: recipientDetails.value,
      })
      .from(recipients)
      .leftJoin(
        recipientDetails,
        eq(recipientDetails.recipientId, recipients.id),
      );

    expect(rows).toEqual(
      expect.arrayContaining([
        { recipient: "Anthony", name: "Shoe", value: "4" },
        { recipient: "Anthony", name: "Shirt", value: "M" },
        { recipient: "Grandma", name: "Allergy", value: "penicillin" },
        { recipient: "Mom", name: null, value: null },
      ]),
    );
    expect(rows).toHaveLength(4);
  });

  it("has the lists, with one archived", async () => {
    const rows = await db
      .select()
      .from(lists)
      .where(eq(lists.groupId, seedIds.groups.garcia));

    expect(rows.map((list) => list.name).sort()).toEqual([
      "Anthony's birthday",
      "Last Christmas",
      "Medicine",
    ]);
    expect(
      rows.filter((list) => list.archivedAt).map((list) => list.id),
    ).toEqual([seedIds.lists.archived]);
  });

  it("items cover every status, with their notes and shipment", async () => {
    const rows = await db
      .select({ item: items })
      .from(items)
      .innerJoin(lists, eq(lists.id, items.listId))
      .where(eq(lists.groupId, seedIds.groups.garcia));
    const byId = new Map(rows.map(({ item }) => [item.id, item]));
    const { juan, luis, pedro } = seedIds.users;
    const { juansShipment } = seedIds.shipments;

    expect(new Set(rows.map(({ item }) => item.status))).toEqual(
      new Set(["pending", "reserved", "purchased", "shipped", "unavailable"]),
    );
    expect(byId.get(seedIds.items.reservedByJuan)).toMatchObject({
      status: "reserved",
      buyerId: juan,
    });
    expect(byId.get(seedIds.items.purchasedByJuan)).toMatchObject({
      status: "purchased",
      buyerId: juan,
      buyerNote: expect.any(String) as unknown as string,
    });
    expect(byId.get(seedIds.items.unavailable)).toMatchObject({
      status: "unavailable",
      buyerId: luis,
      unavailableNote: expect.any(String) as unknown as string,
    });
    expect(byId.get(seedIds.items.purchasedByPedro)).toMatchObject({
      status: "purchased",
      buyerId: pedro,
    });

    const inShipment = rows.filter(
      ({ item }) => item.shipmentId === juansShipment,
    );
    expect(inShipment.map(({ item }) => item.status)).toEqual([
      "shipped",
      "shipped",
    ]);

    expect(
      rows.filter(({ item }) => !item.recipientId).map(({ item }) => item.id),
    ).toEqual([seedIds.items.pendingNoRecipient]);
  });

  it("the former buyer keeps a purchased item", async () => {
    const [membership] = await db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.groupId, seedIds.groups.garcia),
          eq(memberships.userId, seedIds.users.pedro),
        ),
      );
    expect(membership).toMatchObject({
      status: "ended",
      endedAt: expect.any(Date) as unknown as Date,
    });

    const [item] = await db
      .select()
      .from(items)
      .where(eq(items.buyerId, seedIds.users.pedro));
    expect(item).toMatchObject({ status: "purchased" });
  });

  it("invitations cover every state", async () => {
    const rows = await db
      .select()
      .from(invitations)
      .where(eq(invitations.groupId, seedIds.groups.garcia));
    const byId = new Map(rows.map((row) => [row.id, row]));
    expect(rows).toHaveLength(5);

    const pending = byId.get(seedIds.invitations.pending);
    expect(pending?.status).toBe("pending");
    expect(pending?.expiresAt.getTime()).toBeGreaterThan(Date.now());

    const expired = byId.get(seedIds.invitations.expired);
    expect(expired?.status).toBe("pending");
    expect(expired?.expiresAt.getTime()).toBeLessThan(Date.now());

    expect(byId.get(seedIds.invitations.accepted)).toMatchObject({
      status: "accepted",
      acceptedBy: seedIds.users.juan,
      acceptedAt: expect.any(Date) as unknown as Date,
    });
    expect(byId.get(seedIds.invitations.cancelled)?.status).toBe("cancelled");
    expect(byId.get(seedIds.invitations.declined)?.status).toBe("declined");

    expect(pending?.inviteeName).toBe("Carlos");
    expect(
      rows.filter((row) => row.inviteeName !== null).map((row) => row.id),
    ).toEqual([seedIds.invitations.pending]);
  });

  it("the Pérez Group has one item, and only Luis has access to it", async () => {
    const rows = await db
      .select({ item: items })
      .from(items)
      .innerJoin(lists, eq(lists.id, items.listId))
      .where(eq(lists.groupId, seedIds.groups.perez));
    expect(rows.map(({ item }) => item.id)).toEqual([
      seedIds.items.perezPending,
    ]);

    const access = await db
      .select()
      .from(memberships)
      .where(eq(memberships.groupId, seedIds.groups.perez));
    expect(access).toHaveLength(1);
    expect(access[0]).toMatchObject({
      userId: seedIds.users.luis,
      type: "member",
      status: "active",
    });
  });
});

describe("Seed data is consistent", () => {
  beforeAll(resetDatabase);

  it("each group's owner is an active member", async () => {
    const rows = await db.select().from(groups);
    expect(rows).toHaveLength(2);
    for (const group of rows) {
      const [membership] = await db
        .select()
        .from(memberships)
        .where(
          and(
            eq(memberships.groupId, group.id),
            eq(memberships.userId, group.ownerId),
          ),
        );
      expect(membership).toMatchObject({ type: "member", status: "active" });
    }
  });

  // BR-22: the transitions that aren't undos, plus the ones the seed's paths use.
  const ALLOWED = new Set([
    "null>pending",
    "pending>reserved",
    "reserved>pending",
    "reserved>purchased",
    "reserved>unavailable",
    "purchased>shipped",
    "unavailable>pending",
    "purchased>pending",
    "purchased>reserved",
    "shipped>purchased",
    "unavailable>reserved",
  ]);

  it("each item's timeline follows allowed transitions and ends in its status", async () => {
    const allItems = await db.select().from(items);
    expect(allItems).toHaveLength(9);

    for (const item of allItems) {
      const rows = await db
        .select()
        .from(statusHistory)
        .where(eq(statusHistory.itemId, item.id))
        .orderBy(statusHistory.createdAt);

      expect(rows[0]).toMatchObject({
        fromStatus: null,
        toStatus: "pending",
        authorId: item.addedBy,
      });
      rows.forEach((row, index) => {
        expect(ALLOWED).toContain(`${row.fromStatus}>${row.toStatus}`);
        if (index > 0) {
          expect(row.fromStatus).toBe(rows[index - 1]?.toStatus);
          expect(row.authorId).toBe(item.buyerId);
        }
      });
      expect(rows.at(-1)?.toStatus).toBe(item.status);
      expect(item.version).toBe(rows.length);
    }
  });

  it("the shipment matches its items and holds a copy of its address", async () => {
    const [shipment] = await db.select().from(shipments);
    expect(shipment).toBeDefined();
    const [address] = await db
      .select()
      .from(deliveryAddresses)
      .where(eq(deliveryAddresses.id, shipment!.deliveryAddressId!));
    expect(shipment).toMatchObject({
      addressLabel: address?.label,
      addressReceiverName: address?.receiverName,
      addressPhone: address?.phone,
      addressText: address?.address,
      addressCountry: address?.country,
    });

    const rows = await db
      .select({ item: items, groupId: lists.groupId })
      .from(items)
      .innerJoin(lists, eq(lists.id, items.listId))
      .where(eq(items.shipmentId, shipment!.id));
    expect(rows).toHaveLength(2);
    for (const { item, groupId } of rows) {
      expect(item.status).toBe("shipped");
      expect(item.buyerId).toBe(shipment!.buyerId);
      expect(groupId).toBe(shipment!.groupId);
    }
  });

  it("Grandma's house is the group's only default address", async () => {
    const rows = await db
      .select()
      .from(deliveryAddresses)
      .where(eq(deliveryAddresses.isDefault, true));
    expect(rows.map((row) => row.label)).toEqual(["Grandma's house"]);
  });

  it("each person is ready to use the app", async () => {
    const rows = await db.select().from(users);
    expect(rows).toHaveLength(5);
    for (const user of rows) {
      expect(user.language).not.toBeNull();
      expect(isValidPhoneNumber(user.whatsappNumber ?? "")).toBe(true);
      expect(user.termsAcceptedAt).not.toBeNull();
      expect(user.onboardedAt).not.toBeNull();
    }
  });

  it("every delivery address has a valid phone number", async () => {
    const rows = await db.select().from(deliveryAddresses);
    for (const address of rows) {
      expect(isValidPhoneNumber(address.phone)).toBe(true);
    }
  });
});

describe("Seed is safe to load again", () => {
  beforeEach(resetDatabase);

  it("a second load adds nothing and changes nothing", async () => {
    const before = await dumpDatabase(client);
    await loadSeedData(db);
    expect(await dumpDatabase(client)).toEqual(before);
  });

  it("a second load keeps a developer's added and edited rows", async () => {
    const added = await createGroup(db, {
      name: "My own group",
      ownerId: seedIds.users.ana,
    });
    await db
      .update(items)
      .set({ name: "Edited by a developer" })
      .where(eq(items.id, seedIds.items.pending));

    await loadSeedData(db);

    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, added.id));
    expect(group?.name).toBe("My own group");
    const [item] = await db
      .select()
      .from(items)
      .where(eq(items.id, seedIds.items.pending));
    expect(item?.name).toBe("Edited by a developer");
  });

  it("a conflict with other data stops the load and adds no seed rows", async () => {
    await emptyDatabase(client);
    const own = await createUser(db, { email: "ana@example.com" });

    await expectRejected(loadSeedData(db), {
      code: PostgresError.unique,
      constraint: "users_email_unique",
    });

    const rows = await dumpDatabase(client);
    expect(rows.users).toHaveLength(1);
    expect(rows.users?.[0]).toMatchObject({ id: own.id });
    expect(rows.groups).toEqual([]);
  });
});

describe("Seed stays local", () => {
  const run = promisify(execFile);

  it.each([
    ["in its host", "postgres://user:secret@db.example.com:5432/app"],
    [
      "through a connection parameter",
      "postgres://user:secret@localhost:5432/app?host=db.example.com",
    ],
  ])("refuses a remote database %s", async (_how, databaseUrl) => {
    await expect(
      run("npx", ["tsx", "scripts/seed.ts"], {
        env: { ...process.env, DATABASE_URL: databaseUrl },
      }),
    ).rejects.toMatchObject({
      stderr: expect.stringContaining(
        "The seed only loads into a local database",
      ) as unknown as string,
    });
  });
});
