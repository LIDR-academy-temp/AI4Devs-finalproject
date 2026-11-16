import { randomUUID } from "node:crypto";

import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import * as schema from "../../src/server/db/schema";
import {
  createAccount,
  createDeliveryAddress,
  createGroup,
  createInvitation,
  createItem,
  createList,
  createMembership,
  createRecipient,
  createRecipientDetail,
  createSession,
  createShipment,
  createStatusHistory,
  createUser,
  expectRejected,
  PostgresError,
} from "../support/factories";

// Verifies docs/04-DATA-MODEL.md, section 2. The lists below are copied from that section
// rather than read from the schema, so a difference between the two fails a test.

const client = new Client({ connectionString: process.env.DATABASE_URL });
const db = drizzle(client, { schema });

const TOMORROW = "2099-01-01T00:00:00Z";
const MISSING_ID = "00000000-0000-4000-8000-000000000000";

let parents: {
  userId: string;
  buyerId: string;
  groupId: string;
  listId: string;
  recipientId: string;
  addressId: string;
  shipmentId: string;
  itemId: string;
};

type Values = Record<string, unknown>;

/** The smallest valid row per table, so a rejection can only come from the override. */
function validRow(table: string): Values {
  const { userId, buyerId, groupId, listId, recipientId, itemId } = parents;
  const rows: Record<string, Values> = {
    users: { email: `${randomUUID()}@example.com` },
    accounts: {
      provider_id: randomUUID(),
      account_id: randomUUID(),
      user_id: userId,
    },
    sessions: {
      token: randomUUID(),
      user_id: userId,
      expires_at: TOMORROW,
    },
    verifications: { identifier: "state", value: "x", expires_at: TOMORROW },
    groups: { name: "Group", owner_id: userId },
    memberships: {
      group_id: groupId,
      user_id: buyerId,
      type: "buyer",
      joined_at: TOMORROW,
    },
    invitations: {
      group_id: groupId,
      type: "buyer",
      code: randomUUID(),
      created_by: userId,
      expires_at: TOMORROW,
    },
    recipients: { group_id: groupId, name: "Recipient" },
    recipient_details: {
      recipient_id: recipientId,
      name: "Shoe",
      value: "4",
      position: 0,
    },
    lists: { group_id: groupId, name: "List" },
    delivery_addresses: {
      group_id: groupId,
      label: "Label",
      receiver_name: "Receiver",
      phone: "+12025550100",
      address: "123 Example Street",
      country: "CU",
    },
    items: { list_id: listId, name: "Item", added_by: userId },
    shipments: {
      group_id: groupId,
      buyer_id: buyerId,
      ship_date: "2026-01-01",
      agency: "Agency",
      service: "air",
    },
    status_history: {
      item_id: itemId,
      to_status: "pending",
      author_id: userId,
    },
    job_runs: { name: randomUUID() },
    rate_limits: { key: randomUUID(), count: 1, expires_at: TOMORROW },
  };
  const row = rows[table];
  if (!row) throw new Error(`No valid row for ${table}.`);
  return row;
}

/** Raw SQL, because the TypeScript types wouldn't allow many of the rejected values. */
function insert(table: string, overrides: Values = {}) {
  const row = { ...validRow(table), ...overrides };
  const columns = Object.keys(row);
  return client.query(
    `INSERT INTO "${table}" (${columns.map((column) => `"${column}"`).join(", ")})
     VALUES (${columns.map((_, index) => `$${index + 1}`).join(", ")})`,
    Object.values(row),
  );
}

/** Runs the statements and undoes them, so accepted rows can't collide with later tests. */
async function inRollback(statements: () => Promise<unknown>) {
  await client.query("BEGIN");
  try {
    await statements();
  } finally {
    await client.query("ROLLBACK");
  }
}

function expectAccepted(table: string, overrides: Values = {}) {
  return inRollback(() => insert(table, overrides));
}

function expectCheckFails(
  constraint: string,
  table: string,
  overrides: Values,
) {
  return expectRejected(insert(table, overrides), {
    code: PostgresError.check,
    constraint,
  });
}

beforeAll(async () => {
  await client.connect();
  const user = await createUser(db);
  const buyer = await createUser(db);
  const group = await createGroup(db, { ownerId: user.id });
  const list = await createList(db, { groupId: group.id });
  const recipient = await createRecipient(db, { groupId: group.id });
  const address = await createDeliveryAddress(db, { groupId: group.id });
  const shipment = await createShipment(db, {
    groupId: group.id,
    buyerId: buyer.id,
  });
  const item = await createItem(db, { listId: list.id, addedBy: user.id });
  parents = {
    userId: user.id,
    buyerId: buyer.id,
    groupId: group.id,
    listId: list.id,
    recipientId: recipient.id,
    addressId: address.id,
    shipmentId: shipment.id,
    itemId: item.id,
  };
});

afterAll(async () => {
  await client.end();
});

describe("Schema built from migrations", () => {
  async function names(sql: string) {
    const result = await client.query<{ name: string }>(sql);
    return result.rows.map((row) => row.name).sort();
  }

  it("creates every table in the data model", async () => {
    expect(
      await names(
        "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = 'public'",
      ),
    ).toEqual(
      [
        "accounts",
        "delivery_addresses",
        "groups",
        "invitations",
        "items",
        "job_runs",
        "lists",
        "memberships",
        "rate_limits",
        "recipient_details",
        "recipients",
        "sessions",
        "shipments",
        "status_history",
        "users",
        "verifications",
      ].sort(),
    );
  });

  it("creates every enumeration with its values", async () => {
    const result = await client.query<{ name: string; labels: string[] }>(
      `SELECT t.typname AS name,
              array_agg(e.enumlabel::text ORDER BY e.enumsortorder) AS labels
       FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
       GROUP BY t.typname`,
    );
    expect(
      Object.fromEntries(result.rows.map((row) => [row.name, row.labels])),
    ).toEqual({
      language: ["es", "en"],
      membership_type: ["member", "buyer"],
      membership_status: ["active", "ended"],
      invitation_status: ["pending", "accepted", "declined", "cancelled"],
      item_status: [
        "pending",
        "reserved",
        "purchased",
        "shipped",
        "unavailable",
      ],
      link_status: ["none", "pending", "done", "failed"],
      shipping_service: ["maritime", "air"],
    });
  });

  it("creates every index in the data model", async () => {
    const result = await client.query<{ definition: string }>(
      "SELECT indexdef AS definition FROM pg_indexes WHERE schemaname = 'public'",
    );
    const definitions = result.rows.map((row) => row.definition);
    for (const expected of [
      /ON public\.items USING btree \(list_id, status\)/,
      /ON public\.items USING btree \(buyer_id, status\)/,
      /ON public\.items USING btree \(recipient_id\)/,
      /ON public\.status_history USING btree \(created_at\)/,
      /UNIQUE INDEX .* ON public\.delivery_addresses USING btree \(group_id\) WHERE is_default/,
    ]) {
      expect(definitions).toContainEqual(expect.stringMatching(expected));
    }
  });

  it("applying the migrations again changes nothing", async () => {
    const count = () =>
      client.query("SELECT * FROM drizzle.__drizzle_migrations");
    const before = await count();
    await migrate(db, { migrationsFolder: "src/server/db/migrations" });
    const after = await count();
    expect(after.rows).toEqual(before.rows);
  });
});

describe("factories", () => {
  it("each factory's row is accepted", async () => {
    const user = await createUser(db);
    await createAccount(db, { userId: user.id });
    await createSession(db, { userId: user.id });
    const group = await createGroup(db, { ownerId: user.id });
    await createMembership(db, { groupId: group.id, userId: user.id });
    await createInvitation(db, { groupId: group.id, createdBy: user.id });
    const recipient = await createRecipient(db, { groupId: group.id });
    await createRecipientDetail(db, { recipientId: recipient.id });
    const list = await createList(db, { groupId: group.id });
    await createDeliveryAddress(db, { groupId: group.id });
    await createShipment(db, { groupId: group.id, buyerId: user.id });
    const item = await createItem(db, { listId: list.id, addedBy: user.id });
    await createStatusHistory(db, { itemId: item.id, authorId: user.id });
  });

  it.each([
    "users",
    "accounts",
    "sessions",
    "verifications",
    "groups",
    "memberships",
    "invitations",
    "recipients",
    "recipient_details",
    "lists",
    "delivery_addresses",
    "items",
    "shipments",
    "status_history",
    "job_runs",
    "rate_limits",
  ])("the baseline row for %s is accepted", async (table) => {
    await expectAccepted(table);
  });
});

describe("Item buyer follows its status", () => {
  it("rejects a pending item with a buyer", async () => {
    await expectCheckFails("items_buyer_matches_status", "items", {
      status: "pending",
      buyer_id: parents.buyerId,
    });
  });

  it.each(["reserved", "purchased", "shipped", "unavailable"])(
    "rejects a %s item without a buyer",
    async (status) => {
      await expectCheckFails("items_buyer_matches_status", "items", {
        status,
        unavailable_note: "Out of stock",
      });
    },
  );

  it("accepts a reserved item with a buyer", async () => {
    await expectAccepted("items", {
      status: "reserved",
      buyer_id: parents.buyerId,
    });
  });
});

describe("Item shipment follows its status", () => {
  it.each(["reserved", "purchased", "unavailable"])(
    "rejects a %s item in a shipment",
    async (status) => {
      await expectCheckFails("items_shipment_only_when_shipped", "items", {
        status,
        buyer_id: parents.buyerId,
        shipment_id: parents.shipmentId,
        unavailable_note: "Out of stock",
      });
    },
  );

  it("rejects a pending item in a shipment", async () => {
    await expectCheckFails("items_shipment_only_when_shipped", "items", {
      shipment_id: parents.shipmentId,
    });
  });

  it("accepts a shipped item in a shipment", async () => {
    await expectAccepted("items", {
      status: "shipped",
      buyer_id: parents.buyerId,
      shipment_id: parents.shipmentId,
    });
  });
});

describe("Unavailable items keep their note", () => {
  it("rejects an unavailable item without a note", async () => {
    await expectCheckFails("items_unavailable_note_required", "items", {
      status: "unavailable",
      buyer_id: parents.buyerId,
    });
  });

  it("accepts an unavailable item with a note", async () => {
    await expectAccepted("items", {
      status: "unavailable",
      buyer_id: parents.buyerId,
      unavailable_note: "Out of stock",
    });
  });
});

describe("Item quantity range", () => {
  it.each([0, -1, 100])("rejects a quantity of %i", async (quantity) => {
    await expectCheckFails("items_quantity_range", "items", { quantity });
  });

  it.each([1, 99])("accepts a quantity of %i", async (quantity) => {
    await expectAccepted("items", { quantity });
  });

  it("defaults to a quantity of 1", async () => {
    const item = await createItem(db, {
      listId: parents.listId,
      addedBy: parents.userId,
    });
    expect(item.quantity).toBe(1);
  });
});

describe("Stored formats", () => {
  describe.each([
    ["users", "whatsapp_number", "users_whatsapp_number_e164"],
    ["delivery_addresses", "phone", "delivery_addresses_phone_e164"],
    ["shipments", "address_phone", "shipments_address_phone_e164"],
  ])("%s.%s", (table, column, constraint) => {
    it.each(["12025550100", "+0123456", "+1", "+1 202 555", "phone"])(
      "rejects %s",
      async (value) => {
        await expectCheckFails(constraint, table, { [column]: value });
      },
    );

    it("accepts an E.164 number", async () => {
      await expectAccepted(table, { [column]: "+5356000000" });
    });
  });

  it.each([
    ["users", "whatsapp_number"],
    ["shipments", "address_phone"],
    ["shipments", "address_country"],
    ["items", "url"],
  ])("accepts an empty %s.%s", async (table, column) => {
    await expectAccepted(table, { [column]: null });
  });

  it.each([
    "ftp://example.com",
    "javascript:alert(1)",
    "example.com",
    "https:/example.com",
    "",
  ])("rejects a link of %j", async (url) => {
    await expectCheckFails("items_url_scheme", "items", { url });
  });

  it.each(["http://example.com", "https://example.com", "HTTPS://EXAMPLE.COM"])(
    "accepts a link of %s",
    async (url) => {
      await expectAccepted("items", { url });
    },
  );

  describe.each([
    ["delivery_addresses", "country", "delivery_addresses_country_format"],
    ["shipments", "address_country", "shipments_address_country_format"],
  ])("%s.%s", (table, column, constraint) => {
    it.each(["cu", "Cu", "C1", "C", "12"])("rejects %s", async (value) => {
      await expectCheckFails(constraint, table, { [column]: value });
    });

    it("accepts two capital letters", async () => {
      await expectAccepted(table, { [column]: "CU" });
    });
  });

  it("accepts a shipment without an address copy", async () => {
    await expectAccepted("shipments");
  });
});

describe("Unique values", () => {
  function expectSecondRejected(
    constraint: string,
    table: string,
    shared: Values,
  ) {
    return inRollback(async () => {
      await insert(table, shared);
      await expectRejected(insert(table, shared), {
        code: PostgresError.unique,
        constraint,
      });
    });
  }

  it("rejects a second identity for a provider's user ID", async () => {
    const other = await createUser(db);
    await inRollback(async () => {
      await insert("accounts", { provider_id: "google", account_id: "one" });
      await expectRejected(
        insert("accounts", {
          provider_id: "google",
          account_id: "one",
          user_id: other.id,
        }),
        {
          code: PostgresError.unique,
          constraint: "accounts_provider_id_account_id_unique",
        },
      );
    });
  });

  it("rejects a second identity for a user and provider", async () => {
    await inRollback(async () => {
      await insert("accounts", { provider_id: "google", account_id: "one" });
      await expectRejected(
        insert("accounts", { provider_id: "google", account_id: "two" }),
        {
          code: PostgresError.unique,
          constraint: "accounts_user_id_provider_id_unique",
        },
      );
    });
  });

  it("rejects a duplicate email", async () => {
    await expectSecondRejected("users_email_unique", "users", {
      email: "same@example.com",
    });
  });

  it("accepts several users with no email", async () => {
    await inRollback(async () => {
      await insert("users", { email: null });
      await insert("users", { email: null });
    });
  });

  it("rejects a duplicate session token", async () => {
    await expectSecondRejected("sessions_token_unique", "sessions", {
      token: "same",
    });
  });

  it("rejects a duplicate invitation code", async () => {
    await expectSecondRejected("invitations_code_unique", "invitations", {
      code: "same",
    });
  });

  it("rejects a second membership for a user in a group", async () => {
    await expectSecondRejected(
      "memberships_group_id_user_id_unique",
      "memberships",
      {},
    );
  });

  describe("default delivery address", () => {
    const constraint = "delivery_addresses_one_default_per_group";

    it("rejects a second default for a group", async () => {
      await expectSecondRejected(constraint, "delivery_addresses", {
        is_default: true,
      });
    });

    it("accepts a second address that isn't the default", async () => {
      await inRollback(async () => {
        await insert("delivery_addresses", { is_default: true });
        await insert("delivery_addresses", { is_default: false });
        await insert("delivery_addresses", { is_default: false });
      });
    });

    it("accepts a default for another group", async () => {
      const other = await createGroup(db, { ownerId: parents.userId });
      await inRollback(async () => {
        await insert("delivery_addresses", { is_default: true });
        await insert("delivery_addresses", {
          is_default: true,
          group_id: other.id,
        });
      });
    });
  });
});

describe("Required values, enumerations, and text limits", () => {
  const notNull: Record<string, string[]> = {
    users: [
      "id",
      "email_verified",
      "receive_emails",
      "created_at",
      "updated_at",
    ],
    accounts: [
      "id",
      "provider_id",
      "account_id",
      "user_id",
      "created_at",
      "updated_at",
    ],
    sessions: [
      "id",
      "token",
      "user_id",
      "expires_at",
      "created_at",
      "updated_at",
    ],
    verifications: [
      "id",
      "identifier",
      "value",
      "expires_at",
      "created_at",
      "updated_at",
    ],
    groups: ["id", "name", "owner_id", "created_at", "updated_at"],
    memberships: ["id", "group_id", "user_id", "type", "status", "joined_at"],
    invitations: [
      "id",
      "group_id",
      "type",
      "code",
      "status",
      "created_by",
      "expires_at",
      "created_at",
    ],
    recipients: ["id", "group_id", "name", "created_at", "updated_at"],
    recipient_details: ["id", "recipient_id", "name", "value", "position"],
    lists: ["id", "group_id", "name", "created_at", "updated_at"],
    delivery_addresses: [
      "id",
      "group_id",
      "label",
      "receiver_name",
      "phone",
      "address",
      "country",
      "is_default",
      "created_at",
      "updated_at",
    ],
    items: [
      "id",
      "list_id",
      "name",
      "link_status",
      "quantity",
      "status",
      "added_by",
      "updated_after_reservation",
      "version",
      "created_at",
      "updated_at",
    ],
    shipments: [
      "id",
      "group_id",
      "buyer_id",
      "ship_date",
      "agency",
      "service",
      "created_at",
      "updated_at",
    ],
    status_history: [
      "id",
      "item_id",
      "to_status",
      "is_undo",
      "author_id",
      "created_at",
    ],
    job_runs: ["name"],
    rate_limits: ["key", "count", "expires_at"],
  };

  it.each(
    Object.entries(notNull).flatMap(([table, columns]) =>
      columns.map((column) => [table, column] as const),
    ),
  )("rejects an empty %s.%s", async (table, column) => {
    await expectRejected(insert(table, { [column]: null }), {
      code: PostgresError.notNull,
      column,
    });
  });

  it.each([
    ["users", "language"],
    ["memberships", "type"],
    ["memberships", "status"],
    ["invitations", "type"],
    ["invitations", "status"],
    ["items", "status"],
    ["items", "link_status"],
    ["status_history", "from_status"],
    ["status_history", "to_status"],
    ["shipments", "service"],
  ])(
    "rejects a value outside the enumeration in %s.%s",
    async (table, column) => {
      await expectRejected(insert(table, { [column]: "other" }), {
        code: PostgresError.invalidEnumValue,
      });
    },
  );

  it("accepts a declined invitation (BR-08)", async () => {
    await expectAccepted("invitations", { status: "declined" });
  });

  // Each value is valid apart from its length, so the format checks don't get in the way.
  const phoneOfLength = (length: number) => `+1${"2".repeat(length - 2)}`;
  const textOfLength = (length: number) => "x".repeat(length);
  const urlOfLength = (length: number) =>
    `https://${"x".repeat(length - "https://".length)}`;

  it.each([
    ["users", "name", 100, textOfLength],
    ["users", "email", 320, textOfLength],
    ["users", "whatsapp_number", 16, phoneOfLength],
    ["accounts", "provider_id", 50, textOfLength],
    ["accounts", "account_id", 255, textOfLength],
    ["sessions", "token", 255, textOfLength],
    ["sessions", "user_agent", 500, textOfLength],
    ["verifications", "identifier", 255, textOfLength],
    ["groups", "name", 100, textOfLength],
    ["invitations", "code", 43, textOfLength],
    ["invitations", "invitee_name", 100, textOfLength],
    ["recipients", "name", 100, textOfLength],
    ["recipients", "notes", 1000, textOfLength],
    ["recipient_details", "name", 40, textOfLength],
    ["recipient_details", "value", 150, textOfLength],
    ["lists", "name", 100, textOfLength],
    ["delivery_addresses", "label", 100, textOfLength],
    ["delivery_addresses", "receiver_name", 100, textOfLength],
    ["delivery_addresses", "phone", 16, phoneOfLength],
    ["delivery_addresses", "address", 500, textOfLength],
    ["items", "recipient_name", 100, textOfLength],
    ["items", "name", 100, textOfLength],
    ["items", "notes", 1000, textOfLength],
    ["items", "url", 2000, urlOfLength],
    ["items", "store_name", 100, textOfLength],
    ["items", "buyer_note", 1000, textOfLength],
    ["items", "unavailable_note", 1000, textOfLength],
    ["shipments", "agency", 80, textOfLength],
    ["shipments", "address_label", 100, textOfLength],
    ["shipments", "address_receiver_name", 100, textOfLength],
    ["shipments", "address_phone", 16, phoneOfLength],
    ["shipments", "address_text", 500, textOfLength],
    ["job_runs", "name", 50, textOfLength],
    ["rate_limits", "key", 255, textOfLength],
  ] as const)(
    "limits %s.%s to %i characters",
    async (table, column, limit, valueOfLength) => {
      await expectAccepted(table, { [column]: valueOfLength(limit) });
      await expectRejected(
        insert(table, { [column]: valueOfLength(limit + 1) }),
        { code: PostgresError.textTooLong },
      );
    },
  );

  it.each([
    ["delivery_addresses", "country"],
    ["shipments", "address_country"],
  ])("limits %s.%s to two characters", async (table, column) => {
    await expectRejected(insert(table, { [column]: "CUB" }), {
      code: PostgresError.textTooLong,
    });
  });

  it.each([
    ["accounts", "user_id"],
    ["sessions", "user_id"],
    ["groups", "owner_id"],
    ["memberships", "group_id"],
    ["memberships", "user_id"],
    ["invitations", "group_id"],
    ["invitations", "created_by"],
    ["invitations", "accepted_by"],
    ["recipients", "group_id"],
    ["recipient_details", "recipient_id"],
    ["lists", "group_id"],
    ["delivery_addresses", "group_id"],
    ["items", "list_id"],
    ["items", "recipient_id"],
    ["items", "added_by"],
    ["shipments", "group_id"],
    ["shipments", "buyer_id"],
    ["shipments", "delivery_address_id"],
    ["status_history", "item_id"],
    ["status_history", "author_id"],
  ])("rejects a missing row in %s.%s", async (table, column) => {
    await expectRejected(insert(table, { [column]: MISSING_ID }), {
      code: PostgresError.foreignKey,
      constraint: expect.stringContaining(column) as unknown as string,
    });
  });

  it("rejects a missing buyer on an item", async () => {
    await expectRejected(
      insert("items", { status: "reserved", buyer_id: MISSING_ID }),
      {
        code: PostgresError.foreignKey,
        constraint: "items_buyer_id_users_id_fk",
      },
    );
  });

  it("rejects a missing shipment on an item", async () => {
    await expectRejected(
      insert("items", {
        status: "shipped",
        buyer_id: parents.buyerId,
        shipment_id: MISSING_ID,
      }),
      {
        code: PostgresError.foreignKey,
        constraint: "items_shipment_id_shipments_id_fk",
      },
    );
  });
});

describe("Defaults", () => {
  it("applies the defaults in the data model", async () => {
    const user = await createUser(db);
    expect(user).toMatchObject({ emailVerified: false, receiveEmails: true });

    const group = await createGroup(db, { ownerId: user.id });
    const membership = await createMembership(db, {
      groupId: group.id,
      userId: user.id,
    });
    expect(membership.status).toBe("active");

    const invitation = await createInvitation(db, {
      groupId: group.id,
      createdBy: user.id,
    });
    expect(invitation.status).toBe("pending");

    const address = await createDeliveryAddress(db, { groupId: group.id });
    expect(address.isDefault).toBe(false);

    const list = await createList(db, { groupId: group.id });
    const item = await createItem(db, { listId: list.id, addedBy: user.id });
    expect(item).toMatchObject({
      status: "pending",
      linkStatus: "none",
      quantity: 1,
      version: 1,
      updatedAfterReservation: false,
    });

    const history = await createStatusHistory(db, {
      itemId: item.id,
      authorId: user.id,
    });
    expect(history.isUndo).toBe(false);
  });
});

describe("Deleting a group", () => {
  it("deletes everything in a group with items in every status", async () => {
    const owner = await createUser(db);
    const buyer = await createUser(db);
    const group = await createGroup(db, { ownerId: owner.id });
    const membership = await createMembership(db, {
      groupId: group.id,
      userId: owner.id,
    });
    const invitation = await createInvitation(db, {
      groupId: group.id,
      createdBy: owner.id,
    });
    const recipient = await createRecipient(db, { groupId: group.id });
    const detail = await createRecipientDetail(db, {
      recipientId: recipient.id,
    });
    const list = await createList(db, { groupId: group.id });
    const address = await createDeliveryAddress(db, {
      groupId: group.id,
      isDefault: true,
    });
    const shipment = await createShipment(db, {
      groupId: group.id,
      buyerId: buyer.id,
      deliveryAddressId: address.id,
    });
    const base = {
      listId: list.id,
      addedBy: owner.id,
      recipientId: recipient.id,
    };
    const inGroup = [
      await createItem(db, base),
      await createItem(db, { ...base, status: "reserved", buyerId: buyer.id }),
      await createItem(db, { ...base, status: "purchased", buyerId: buyer.id }),
      await createItem(db, {
        ...base,
        status: "shipped",
        buyerId: buyer.id,
        shipmentId: shipment.id,
      }),
      await createItem(db, {
        ...base,
        status: "unavailable",
        buyerId: buyer.id,
        unavailableNote: "Out of stock",
      }),
    ];
    const history = await createStatusHistory(db, {
      itemId: inGroup[0]!.id,
      authorId: owner.id,
    });

    const otherGroup = await createGroup(db, { ownerId: owner.id });
    const otherList = await createList(db, { groupId: otherGroup.id });
    const otherItem = await createItem(db, {
      listId: otherList.id,
      addedBy: owner.id,
    });

    await db.delete(schema.groups).where(eq(schema.groups.id, group.id));

    const remaining = {
      groups: await db
        .select()
        .from(schema.groups)
        .where(eq(schema.groups.id, group.id)),
      memberships: await db
        .select()
        .from(schema.memberships)
        .where(eq(schema.memberships.id, membership.id)),
      invitations: await db
        .select()
        .from(schema.invitations)
        .where(eq(schema.invitations.id, invitation.id)),
      recipients: await db
        .select()
        .from(schema.recipients)
        .where(eq(schema.recipients.id, recipient.id)),
      details: await db
        .select()
        .from(schema.recipientDetails)
        .where(eq(schema.recipientDetails.id, detail.id)),
      lists: await db
        .select()
        .from(schema.lists)
        .where(eq(schema.lists.id, list.id)),
      addresses: await db
        .select()
        .from(schema.deliveryAddresses)
        .where(eq(schema.deliveryAddresses.id, address.id)),
      shipments: await db
        .select()
        .from(schema.shipments)
        .where(eq(schema.shipments.id, shipment.id)),
      items: await db
        .select()
        .from(schema.items)
        .where(
          inArray(
            schema.items.id,
            inGroup.map((item) => item.id),
          ),
        ),
      history: await db
        .select()
        .from(schema.statusHistory)
        .where(eq(schema.statusHistory.id, history.id)),
    };
    for (const rows of Object.values(remaining)) {
      expect(rows).toEqual([]);
    }

    const users = await db
      .select()
      .from(schema.users)
      .where(inArray(schema.users.id, [owner.id, buyer.id]));
    expect(users).toHaveLength(2);
    const other = await db
      .select()
      .from(schema.items)
      .where(eq(schema.items.id, otherItem.id));
    expect(other).toHaveLength(1);
  });
});

describe("Deleting a recipient, address, or shipment", () => {
  it("keeps a shipped item when its recipient is deleted", async () => {
    const recipient = await createRecipient(db, { groupId: parents.groupId });
    const item = await createItem(db, {
      listId: parents.listId,
      addedBy: parents.userId,
      status: "shipped",
      buyerId: parents.buyerId,
      shipmentId: parents.shipmentId,
      recipientId: recipient.id,
      recipientName: recipient.name,
    });

    await db
      .delete(schema.recipients)
      .where(eq(schema.recipients.id, recipient.id));

    const [kept] = await db
      .select()
      .from(schema.items)
      .where(eq(schema.items.id, item.id));
    expect(kept).toMatchObject({
      recipientId: null,
      recipientName: recipient.name,
    });
  });

  it("keeps a shipment and its copy when its address is deleted", async () => {
    const address = await createDeliveryAddress(db, {
      groupId: parents.groupId,
    });
    const shipment = await createShipment(db, {
      groupId: parents.groupId,
      buyerId: parents.buyerId,
      deliveryAddressId: address.id,
      addressLabel: address.label,
      addressText: address.address,
    });

    await db
      .delete(schema.deliveryAddresses)
      .where(eq(schema.deliveryAddresses.id, address.id));

    const [kept] = await db
      .select()
      .from(schema.shipments)
      .where(eq(schema.shipments.id, shipment.id));
    expect(kept).toMatchObject({
      deliveryAddressId: null,
      addressLabel: address.label,
      addressText: address.address,
    });
  });

  it("keeps a shipped item when its shipment is deleted", async () => {
    const shipment = await createShipment(db, {
      groupId: parents.groupId,
      buyerId: parents.buyerId,
    });
    const item = await createItem(db, {
      listId: parents.listId,
      addedBy: parents.userId,
      status: "shipped",
      buyerId: parents.buyerId,
      shipmentId: shipment.id,
    });

    await db
      .delete(schema.shipments)
      .where(eq(schema.shipments.id, shipment.id));

    const [kept] = await db
      .select()
      .from(schema.items)
      .where(eq(schema.items.id, item.id));
    expect(kept).toMatchObject({ status: "shipped", shipmentId: null });
  });
});

describe("Users stay in the database", () => {
  const roles: [string, (userId: string) => Promise<unknown>][] = [
    ["owner", (userId) => createGroup(db, { ownerId: userId })],
    [
      "member",
      (userId) => createMembership(db, { groupId: parents.groupId, userId }),
    ],
    [
      "inviter",
      (userId) =>
        createInvitation(db, { groupId: parents.groupId, createdBy: userId }),
    ],
    [
      "invitee",
      (userId) =>
        createInvitation(db, {
          groupId: parents.groupId,
          createdBy: parents.userId,
          acceptedBy: userId,
        }),
    ],
    [
      "buyer of an item",
      (userId) =>
        createItem(db, {
          listId: parents.listId,
          addedBy: parents.userId,
          status: "reserved",
          buyerId: userId,
        }),
    ],
    [
      "person who added an item",
      (userId) => createItem(db, { listId: parents.listId, addedBy: userId }),
    ],
    [
      "buyer of a shipment",
      (userId) =>
        createShipment(db, { groupId: parents.groupId, buyerId: userId }),
    ],
    [
      "author of a status change",
      (userId) =>
        createStatusHistory(db, { itemId: parents.itemId, authorId: userId }),
    ],
  ];

  it.each(roles)("rejects deleting the %s", async (_role, createReference) => {
    const user = await createUser(db);
    await createReference(user.id);

    await expectRejected(
      db.delete(schema.users).where(eq(schema.users.id, user.id)),
      { code: PostgresError.foreignKey },
    );
  });

  it("deletes a user's identity and session with them", async () => {
    const user = await createUser(db);
    const account = await createAccount(db, { userId: user.id });
    const session = await createSession(db, { userId: user.id });

    await db.delete(schema.users).where(eq(schema.users.id, user.id));

    expect(
      await db.select().from(schema.users).where(eq(schema.users.id, user.id)),
    ).toEqual([]);
    expect(
      await db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.id, account.id)),
    ).toEqual([]);
    expect(
      await db
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.id, session.id)),
    ).toEqual([]);
  });
});
