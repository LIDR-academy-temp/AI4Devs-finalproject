// Tables, constraints, and indexes from docs/04-DATA-MODEL.md, section 2. Properties are
// camelCase for Better Auth's adapter; each column's database name is written out.
import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const language = pgEnum("language", ["es", "en"]);
export const membershipType = pgEnum("membership_type", ["member", "buyer"]);
export const membershipStatus = pgEnum("membership_status", [
  "active",
  "ended",
]);
export const invitationStatus = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "declined",
  "cancelled",
]);
export const itemStatus = pgEnum("item_status", [
  "pending",
  "reserved",
  "purchased",
  "shipped",
  "unavailable",
]);
export const linkStatus = pgEnum("link_status", [
  "none",
  "pending",
  "done",
  "failed",
]);
export const shippingService = pgEnum("shipping_service", ["maritime", "air"]);

function timestamptz(name: string) {
  return timestamp(name, { withTimezone: true });
}

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamptz("created_at").notNull().defaultNow();
const updatedAt = () => timestamptz("updated_at").notNull().defaultNow();

const E164 = "^\\+[1-9][0-9]{1,14}$";
const COUNTRY = "^[A-Z]{2}$";

export const users = pgTable(
  "users",
  {
    id: id(),
    name: varchar("name", { length: 100 }),
    email: varchar("email", { length: 320 }).unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    language: language("language"),
    whatsappNumber: varchar("whatsapp_number", { length: 16 }),
    termsAcceptedAt: timestamptz("terms_accepted_at"),
    onboardedAt: timestamptz("onboarded_at"),
    receiveEmails: boolean("receive_emails").notNull().default(true),
    deletedAt: timestamptz("deleted_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check(
      "users_whatsapp_number_e164",
      sql`${table.whatsappNumber} ~ ${sql.raw(`'${E164}'`)}`,
    ),
  ],
);

export const accounts = pgTable(
  "accounts",
  {
    id: id(),
    providerId: varchar("provider_id", { length: 50 }).notNull(),
    accountId: varchar("account_id", { length: 255 }).notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Defined by Better Auth; the app doesn't use them.
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamptz("access_token_expires_at"),
    refreshTokenExpiresAt: timestamptz("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("accounts_provider_id_account_id_unique").on(
      table.providerId,
      table.accountId,
    ),
    unique("accounts_user_id_provider_id_unique").on(
      table.userId,
      table.providerId,
    ),
  ],
);

export const sessions = pgTable("sessions", {
  id: id(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamptz("expires_at").notNull(),
  userAgent: varchar("user_agent", { length: 500 }),
  // Defined by Better Auth; IP address recording is turned off, so it stays null.
  ipAddress: text("ip_address"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const verifications = pgTable("verifications", {
  id: id(),
  identifier: varchar("identifier", { length: 255 }).notNull(),
  value: text("value").notNull(),
  expiresAt: timestamptz("expires_at").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const groups = pgTable("groups", {
  id: id(),
  name: varchar("name", { length: 100 }).notNull(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const memberships = pgTable(
  "memberships",
  {
    id: id(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    type: membershipType("type").notNull(),
    status: membershipStatus("status").notNull().default("active"),
    joinedAt: timestamptz("joined_at").notNull(),
    endedAt: timestamptz("ended_at"),
  },
  (table) => [
    unique("memberships_group_id_user_id_unique").on(
      table.groupId,
      table.userId,
    ),
  ],
);

export const invitations = pgTable("invitations", {
  id: id(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  type: membershipType("type").notNull(),
  inviteeName: varchar("invitee_name", { length: 100 }),
  code: varchar("code", { length: 43 }).notNull().unique(),
  status: invitationStatus("status").notNull().default("pending"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  expiresAt: timestamptz("expires_at").notNull(),
  acceptedBy: uuid("accepted_by").references(() => users.id),
  acceptedAt: timestamptz("accepted_at"),
  createdAt: createdAt(),
});

export const recipients = pgTable("recipients", {
  id: id(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  notes: varchar("notes", { length: 1000 }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const recipientDetails = pgTable("recipient_details", {
  id: id(),
  recipientId: uuid("recipient_id")
    .notNull()
    .references(() => recipients.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 40 }).notNull(),
  value: varchar("value", { length: 150 }).notNull(),
  position: smallint("position").notNull(),
});

export const lists = pgTable("lists", {
  id: id(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  archivedAt: timestamptz("archived_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const deliveryAddresses = pgTable(
  "delivery_addresses",
  {
    id: id(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 100 }).notNull(),
    receiverName: varchar("receiver_name", { length: 100 }).notNull(),
    phone: varchar("phone", { length: 16 }).notNull(),
    address: varchar("address", { length: 500 }).notNull(),
    country: char("country", { length: 2 }).notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("delivery_addresses_one_default_per_group")
      .on(table.groupId)
      .where(sql`${table.isDefault}`),
    check(
      "delivery_addresses_phone_e164",
      sql`${table.phone} ~ ${sql.raw(`'${E164}'`)}`,
    ),
    check(
      "delivery_addresses_country_format",
      sql`${table.country} ~ ${sql.raw(`'${COUNTRY}'`)}`,
    ),
  ],
);

export const shipments = pgTable(
  "shipments",
  {
    id: id(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => users.id),
    shipDate: date("ship_date").notNull(),
    agency: varchar("agency", { length: 80 }).notNull(),
    service: shippingService("service").notNull(),
    deliveryAddressId: uuid("delivery_address_id").references(
      () => deliveryAddresses.id,
      { onDelete: "set null" },
    ),
    addressLabel: varchar("address_label", { length: 100 }),
    addressReceiverName: varchar("address_receiver_name", { length: 100 }),
    addressPhone: varchar("address_phone", { length: 16 }),
    addressText: varchar("address_text", { length: 500 }),
    addressCountry: char("address_country", { length: 2 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check(
      "shipments_address_phone_e164",
      sql`${table.addressPhone} ~ ${sql.raw(`'${E164}'`)}`,
    ),
    check(
      "shipments_address_country_format",
      sql`${table.addressCountry} ~ ${sql.raw(`'${COUNTRY}'`)}`,
    ),
  ],
);

export const items = pgTable(
  "items",
  {
    id: id(),
    listId: uuid("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    recipientId: uuid("recipient_id").references(() => recipients.id, {
      onDelete: "set null",
    }),
    recipientName: varchar("recipient_name", { length: 100 }),
    name: varchar("name", { length: 100 }).notNull(),
    notes: varchar("notes", { length: 1000 }),
    url: varchar("url", { length: 2000 }),
    storeName: varchar("store_name", { length: 100 }),
    thumbnailUrl: text("thumbnail_url"),
    linkStatus: linkStatus("link_status").notNull().default("none"),
    quantity: smallint("quantity").notNull().default(1),
    status: itemStatus("status").notNull().default("pending"),
    buyerId: uuid("buyer_id").references(() => users.id),
    buyerNote: varchar("buyer_note", { length: 1000 }),
    unavailableNote: varchar("unavailable_note", { length: 1000 }),
    shipmentId: uuid("shipment_id").references(() => shipments.id, {
      onDelete: "set null",
    }),
    addedBy: uuid("added_by")
      .notNull()
      .references(() => users.id),
    updatedAfterReservation: boolean("updated_after_reservation")
      .notNull()
      .default(false),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("items_list_id_status_index").on(table.listId, table.status),
    index("items_buyer_id_status_index").on(table.buyerId, table.status),
    index("items_recipient_id_index").on(table.recipientId),
    check("items_quantity_range", sql`${table.quantity} BETWEEN 1 AND 99`),
    check(
      "items_buyer_matches_status",
      sql`(${table.status} = 'pending') = (${table.buyerId} IS NULL)`,
    ),
    // One way only: deleting a group can clear shipment_id before it deletes the item.
    check(
      "items_shipment_only_when_shipped",
      sql`${table.shipmentId} IS NULL OR ${table.status} = 'shipped'`,
    ),
    check(
      "items_unavailable_note_required",
      sql`${table.status} <> 'unavailable' OR ${table.unavailableNote} IS NOT NULL`,
    ),
    check("items_url_scheme", sql`${table.url} ~* '^https?://'`),
  ],
);

export const statusHistory = pgTable(
  "status_history",
  {
    id: id(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    fromStatus: itemStatus("from_status"),
    toStatus: itemStatus("to_status").notNull(),
    isUndo: boolean("is_undo").notNull().default(false),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
  },
  (table) => [index("status_history_created_at_index").on(table.createdAt)],
);

export const jobRuns = pgTable("job_runs", {
  name: varchar("name", { length: 50 }).primaryKey(),
  lastStartedAt: timestamptz("last_started_at"),
  lastCompletedAt: timestamptz("last_completed_at"),
});

export const rateLimits = pgTable("rate_limits", {
  key: varchar("key", { length: 255 }).primaryKey(),
  count: integer("count").notNull(),
  expiresAt: timestamptz("expires_at").notNull(),
});
