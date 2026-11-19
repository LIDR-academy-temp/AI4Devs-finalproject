import { randomBytes, randomUUID } from "node:crypto";

import { expect } from "vitest";

import type { Database } from "../../src/server/db/client";
import {
  accounts,
  deliveryAddresses,
  groups,
  invitations,
  items,
  lists,
  memberships,
  recipientDetails,
  recipients,
  sessions,
  shipments,
  statusHistory,
  users,
} from "../../src/server/db/schema";

// Small factories for valid rows (docs/07-SECURITY-AND-TESTING.md, section 2.3). Each one
// fills in what the database requires, so a test shows only the data it depends on.

const FAR_FUTURE = new Date("2099-01-01T00:00:00Z");

/** Inserts and returns the row, which `returning` always gives back. */
function only<Row>(rows: Row[]): Row {
  const [row] = rows;
  if (!row) throw new Error("The insert returned no row.");
  return row;
}

export async function createUser(
  db: Database,
  values: Partial<typeof users.$inferInsert> = {},
) {
  return only(
    await db
      .insert(users)
      .values({ email: `${randomUUID()}@example.com`, ...values })
      .returning(),
  );
}

export async function createAccount(
  db: Database,
  values: Pick<typeof accounts.$inferInsert, "userId"> &
    Partial<typeof accounts.$inferInsert>,
) {
  return only(
    await db
      .insert(accounts)
      .values({ providerId: "google", accountId: randomUUID(), ...values })
      .returning(),
  );
}

export async function createSession(
  db: Database,
  values: Pick<typeof sessions.$inferInsert, "userId"> &
    Partial<typeof sessions.$inferInsert>,
) {
  return only(
    await db
      .insert(sessions)
      .values({ token: randomUUID(), expiresAt: FAR_FUTURE, ...values })
      .returning(),
  );
}

export async function createGroup(
  db: Database,
  values: Pick<typeof groups.$inferInsert, "ownerId"> &
    Partial<typeof groups.$inferInsert>,
) {
  return only(
    await db
      .insert(groups)
      .values({ name: "Test group", ...values })
      .returning(),
  );
}

export async function createMembership(
  db: Database,
  values: Pick<typeof memberships.$inferInsert, "groupId" | "userId"> &
    Partial<typeof memberships.$inferInsert>,
) {
  return only(
    await db
      .insert(memberships)
      .values({ type: "member", joinedAt: new Date(), ...values })
      .returning(),
  );
}

export async function createInvitation(
  db: Database,
  values: Pick<typeof invitations.$inferInsert, "groupId" | "createdBy"> &
    Partial<typeof invitations.$inferInsert>,
) {
  return only(
    await db
      .insert(invitations)
      .values({
        type: "buyer",
        // The shape of a real code (docs/04-DATA-MODEL.md, section 2).
        code: randomBytes(32).toString("base64url"),
        expiresAt: FAR_FUTURE,
        ...values,
      })
      .returning(),
  );
}

export async function createRecipient(
  db: Database,
  values: Pick<typeof recipients.$inferInsert, "groupId"> &
    Partial<typeof recipients.$inferInsert>,
) {
  return only(
    await db
      .insert(recipients)
      .values({ name: "Test recipient", ...values })
      .returning(),
  );
}

export async function createRecipientDetail(
  db: Database,
  values: Pick<typeof recipientDetails.$inferInsert, "recipientId"> &
    Partial<typeof recipientDetails.$inferInsert>,
) {
  return only(
    await db
      .insert(recipientDetails)
      .values({ name: "Shoe", value: "4", position: 0, ...values })
      .returning(),
  );
}

export async function createList(
  db: Database,
  values: Pick<typeof lists.$inferInsert, "groupId"> &
    Partial<typeof lists.$inferInsert>,
) {
  return only(
    await db
      .insert(lists)
      .values({ name: "Test list", ...values })
      .returning(),
  );
}

export async function createDeliveryAddress(
  db: Database,
  values: Pick<typeof deliveryAddresses.$inferInsert, "groupId"> &
    Partial<typeof deliveryAddresses.$inferInsert>,
) {
  return only(
    await db
      .insert(deliveryAddresses)
      .values({
        label: "Test address",
        receiverName: "Test receiver",
        phone: "+12025550100",
        address: "123 Example Street",
        country: "CU",
        ...values,
      })
      .returning(),
  );
}

export async function createShipment(
  db: Database,
  values: Pick<typeof shipments.$inferInsert, "groupId" | "buyerId"> &
    Partial<typeof shipments.$inferInsert>,
) {
  return only(
    await db
      .insert(shipments)
      .values({
        shipDate: "2026-01-01",
        agency: "Test agency",
        service: "air",
        ...values,
      })
      .returning(),
  );
}

export async function createItem(
  db: Database,
  values: Pick<typeof items.$inferInsert, "listId" | "addedBy"> &
    Partial<typeof items.$inferInsert>,
) {
  return only(
    await db
      .insert(items)
      .values({ name: "Test item", ...values })
      .returning(),
  );
}

export async function createStatusHistory(
  db: Database,
  values: Pick<typeof statusHistory.$inferInsert, "itemId" | "authorId"> &
    Partial<typeof statusHistory.$inferInsert>,
) {
  return only(
    await db
      .insert(statusHistory)
      .values({ toStatus: "pending", ...values })
      .returning(),
  );
}

export const PostgresError = {
  invalidEnumValue: "22P02",
  textTooLong: "22001",
  notNull: "23502",
  foreignKey: "23503",
  unique: "23505",
  check: "23514",
} as const;

type Failure = {
  code?: string;
  constraint?: string;
  column?: string;
  cause?: Failure;
};

/**
 * Proves why a statement was rejected. "It threw" isn't enough: that also passes when
 * the row was invalid for another reason, such as a missing parent row.
 */
export async function expectRejected(
  statement: Promise<unknown>,
  expected: { code: string; constraint?: string; column?: string },
) {
  let failure: Failure | undefined;
  try {
    await statement;
  } catch (error) {
    failure = error as Failure;
  }
  if (!failure) {
    throw new Error("The database accepted the statement.");
  }
  // Drizzle wraps the driver's error; a raw query gives it directly.
  const { code, constraint, column } = failure.code
    ? failure
    : (failure.cause ?? failure);
  expect({ code, constraint, column }).toMatchObject(expected);
}
