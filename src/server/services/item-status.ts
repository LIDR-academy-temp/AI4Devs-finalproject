import { and, eq, type SQL, sql } from "drizzle-orm";

import type { Language } from "../../shared/languages";
import type { ItemStatus } from "../../shared/requests";
import type { Clock } from "../clock";
import type { Database } from "../db/client";
import { items, statusHistory } from "../db/schema";
import { resolveGroupAccess } from "./access";
import {
  AlreadyReservedError,
  ForbiddenError,
  ItemChangedError,
  NotAvailableError,
} from "./errors";
import { type ItemView, loadItem, readItem } from "./items";

// Status changes within BR-22: reserve, release, and purchase (FR-24, FR-25).
// Each one is a single conditional update, so of two simultaneous requests
// only one can pass (BR-23, Architecture §3), recorded in the status history
// in the same transaction (BR-26). The version rises with every change, so a
// member's edit from before it is refused (BR-20).

type Action = "reserve" | "release" | "purchase";

type Transition = {
  action: Action;
  from: ItemStatus;
  to: ItemStatus;
  /** Only the item's buyer may take the action. */
  buyerOnly: boolean;
  set: Partial<typeof items.$inferInsert>;
};

/**
 * Why a change was refused, read after the conditional update matched no row
 * (design decision 2 of the T-11 change).
 */
async function refusal(
  db: Database,
  itemId: string,
  userId: string,
  action: Action,
): Promise<Error> {
  const item = await loadItem(db, itemId);
  if (!item) return new NotAvailableError();
  const someoneElses = item.buyerId !== null && item.buyerId !== userId;
  if (action === "reserve") {
    return someoneElses && item.status === "reserved"
      ? new AlreadyReservedError()
      : new ItemChangedError();
  }
  return someoneElses ? new ForbiddenError() : new ItemChangedError();
}

async function changeStatus(
  db: Database,
  clock: Clock,
  userId: string,
  itemId: string,
  language: Language,
  transition: Transition,
): Promise<ItemView> {
  const item = await loadItem(db, itemId);
  if (!item) throw new NotAvailableError();
  // Members and buyers alike (BR-12); a user outside the group, or whose
  // membership ended, can't see the item (BR-13).
  await resolveGroupAccess(db, userId, item.groupId);

  const now = clock();
  const conditions: SQL[] = [
    eq(items.id, itemId),
    eq(items.status, transition.from),
  ];
  if (transition.buyerOnly) conditions.push(eq(items.buyerId, userId));

  const changed = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(items)
      .set({
        ...transition.set,
        status: transition.to,
        version: sql`${items.version} + 1`,
        updatedAt: now,
      })
      .where(and(...conditions))
      .returning({ id: items.id });
    if (!row) return false;
    await tx.insert(statusHistory).values({
      itemId,
      fromStatus: transition.from,
      toStatus: transition.to,
      authorId: userId,
      createdAt: now,
    });
    return true;
  });
  if (!changed) throw await refusal(db, itemId, userId, transition.action);
  return readItem(db, itemId, language);
}

/** "I'll buy it": reserves a pending item for a member or buyer of its group (FR-24). */
export function reserveItem(
  db: Database,
  clock: Clock,
  userId: string,
  itemId: string,
  language: Language,
): Promise<ItemView> {
  return changeStatus(db, clock, userId, itemId, language, {
    action: "reserve",
    from: "pending",
    to: "reserved",
    buyerOnly: false,
    // Nothing has been edited since this reservation (BR-19).
    set: { buyerId: userId, updatedAfterReservation: false },
  });
}

/** Release: the item's buyer returns it to pending, for anyone to reserve (FR-24). */
export function releaseItem(
  db: Database,
  clock: Clock,
  userId: string,
  itemId: string,
  language: Language,
): Promise<ItemView> {
  return changeStatus(db, clock, userId, itemId, language, {
    action: "release",
    from: "reserved",
    to: "pending",
    buyerOnly: true,
    // The note belonged to the buyer who let the item go.
    set: { buyerId: null, buyerNote: null, updatedAfterReservation: false },
  });
}

/**
 * "I bought it": the item's buyer marks it as purchased (FR-25). A note
 * replaces the buyer note, null clears it, and leaving it out keeps it (BR-25).
 */
export function purchaseItem(
  db: Database,
  clock: Clock,
  userId: string,
  itemId: string,
  input: { buyerNote?: string | null },
  language: Language,
): Promise<ItemView> {
  return changeStatus(db, clock, userId, itemId, language, {
    action: "purchase",
    from: "reserved",
    to: "purchased",
    buyerOnly: true,
    set: input.buyerNote !== undefined ? { buyerNote: input.buyerNote } : {},
  });
}
