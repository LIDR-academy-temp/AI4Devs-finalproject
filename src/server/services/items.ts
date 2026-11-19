import { and, asc, eq, inArray, isNull, type SQL } from "drizzle-orm";
import { z } from "zod";

import type { Language } from "../../shared/languages";
import type { ItemStatus } from "../../shared/requests";
import type { Clock } from "../clock";
import type { Database } from "../db/client";
import {
  groups,
  items,
  lists,
  recipients,
  statusHistory,
  users,
} from "../db/schema";
import { requireMemberAccess, resolveGroupAccess } from "./access";
import {
  InvalidFieldsError,
  ItemChangedError,
  NotAvailableError,
} from "./errors";
import { requireListAccess } from "./lists";
import { personName } from "./people";

// Items (FR-13, FR-16): create, read, edit, move, and delete, within BR-19 and
// the version check of BR-20, with creation and status changes in the status
// history (BR-26). Status and version checks are conditional statements, so
// two simultaneous requests can't both pass them (Architecture §3).

export type ItemView = {
  id: string;
  listId: string;
  name: string;
  notes: string | null;
  url: string | null;
  storeName: string | null;
  thumbnailUrl: string | null;
  linkStatus: "none" | "pending" | "done" | "failed";
  quantity: number;
  status: ItemStatus;
  recipient: { id: string; name: string } | null;
  buyer: { id: string; name: string } | null;
  buyerNote: string | null;
  shipmentId: string | null;
  updatedAfterReservation: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateItemInput = {
  name: string;
  recipientId?: string | null;
  url?: string | null;
  quantity: number;
  notes?: string | null;
};

export type UpdateItemInput = {
  version: number;
  name?: string;
  recipientId?: string | null;
  url?: string | null;
  quantity?: number;
  notes?: string | null;
  listId?: string;
};

export type ItemFilters = {
  recipientId?: string;
  status?: ItemStatus;
};

/** Members edit while pending, reserved, or unavailable (BR-19). */
const EDITABLE: readonly ItemStatus[] = ["pending", "reserved", "unavailable"];

/** Members delete while pending or unavailable (BR-19). */
const DELETABLE: readonly ItemStatus[] = ["pending", "unavailable"];

const uuid = z.uuid();

/**
 * Item rows with the recipient's and buyer's names, and the list and group
 * they belong to, in one query. Items in archived lists are left out (BR-13).
 */
export function selectItems(db: Database, where: SQL | undefined) {
  return db
    .select({
      item: items,
      listName: lists.name,
      groupId: groups.id,
      groupName: groups.name,
      recipientName: recipients.name,
      buyerName: users.name,
      buyerEmail: users.email,
      buyerDeletedAt: users.deletedAt,
    })
    .from(items)
    .innerJoin(lists, eq(lists.id, items.listId))
    .innerJoin(groups, eq(groups.id, lists.groupId))
    .leftJoin(recipients, eq(recipients.id, items.recipientId))
    .leftJoin(users, eq(users.id, items.buyerId))
    .where(and(isNull(lists.archivedAt), where))
    .orderBy(asc(items.createdAt), asc(items.id));
}

export type ItemRow = Awaited<ReturnType<typeof selectItems>>[number];

export function toView(row: ItemRow, language: Language): ItemView {
  const { item } = row;
  return {
    id: item.id,
    listId: item.listId,
    name: item.name,
    notes: item.notes,
    url: item.url,
    storeName: item.storeName,
    thumbnailUrl: item.thumbnailUrl,
    linkStatus: item.linkStatus,
    quantity: item.quantity,
    status: item.status,
    recipient:
      item.recipientId && row.recipientName !== null
        ? { id: item.recipientId, name: row.recipientName }
        : null,
    buyer: item.buyerId
      ? {
          id: item.buyerId,
          name: personName(
            {
              name: row.buyerName,
              email: row.buyerEmail,
              deletedAt: row.buyerDeletedAt,
            },
            language,
          ),
        }
      : null,
    buyerNote: item.buyerNote,
    shipmentId: item.shipmentId,
    updatedAfterReservation: item.updatedAfterReservation,
    version: item.version,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export async function readItem(
  db: Database,
  itemId: string,
  language: Language,
) {
  const [row] = await selectItems(db, eq(items.id, itemId));
  if (!row) throw new NotAvailableError();
  return toView(row, language);
}

/**
 * The item's status, buyer, version, and group, or null when the ID is
 * malformed, the item doesn't exist, or its list is archived (BR-13).
 */
export async function loadItem(db: Database, itemId: string) {
  if (!uuid.safeParse(itemId).success) return null;
  const [item] = await db
    .select({
      id: items.id,
      status: items.status,
      buyerId: items.buyerId,
      version: items.version,
      url: items.url,
      groupId: lists.groupId,
    })
    .from(items)
    .innerJoin(lists, eq(lists.id, items.listId))
    .where(and(eq(items.id, itemId), isNull(lists.archivedAt)));
  return item ?? null;
}

/** The recipient must belong to the group; anything else is a field error. */
async function checkRecipient(
  db: Database,
  groupId: string,
  recipientId: string | null | undefined,
) {
  if (!recipientId) return;
  const [recipient] = await db
    .select({ id: recipients.id })
    .from(recipients)
    .where(
      and(eq(recipients.id, recipientId), eq(recipients.groupId, groupId)),
    );
  if (!recipient) throw new InvalidFieldsError({ recipientId: "invalid" });
}

/** The target list must be a list of the group that isn't archived (FR-16). */
async function checkTargetList(
  db: Database,
  groupId: string,
  listId: string | undefined,
) {
  if (!listId) return;
  const [list] = await db
    .select({ id: lists.id })
    .from(lists)
    .where(
      and(
        eq(lists.id, listId),
        eq(lists.groupId, groupId),
        isNull(lists.archivedAt),
      ),
    );
  if (!list) throw new InvalidFieldsError({ listId: "invalid" });
}

/** The items in a list, for members and buyers, filtered (FR-11). */
export async function listItems(
  db: Database,
  userId: string,
  listId: string,
  filters: ItemFilters,
  language: Language,
): Promise<ItemView[]> {
  await requireListAccess(db, userId, listId, "read");
  const conditions: SQL[] = [eq(items.listId, listId)];
  if (filters.recipientId === "none") {
    conditions.push(isNull(items.recipientId));
  } else if (filters.recipientId) {
    conditions.push(eq(items.recipientId, filters.recipientId));
  }
  if (filters.status) conditions.push(eq(items.status, filters.status));
  const rows = await selectItems(db, and(...conditions));
  return rows.map((row) => toView(row, language));
}

/** Creates a pending item in the list, for a member, and records it (BR-26). */
export async function createItem(
  db: Database,
  clock: Clock,
  userId: string,
  listId: string,
  input: CreateItemInput,
  language: Language,
): Promise<ItemView> {
  const { list } = await requireListAccess(db, userId, listId, "change");
  await checkRecipient(db, list.groupId, input.recipientId);

  const now = clock();
  const itemId = await db.transaction(async (tx) => {
    const [item] = await tx
      .insert(items)
      .values({
        listId,
        name: input.name,
        recipientId: input.recipientId ?? null,
        url: input.url ?? null,
        quantity: input.quantity,
        notes: input.notes ?? null,
        addedBy: userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: items.id });
    if (!item) throw new Error("The item insert returned no row.");
    await tx.insert(statusHistory).values({
      itemId: item.id,
      fromStatus: null,
      toStatus: "pending",
      authorId: userId,
      createdAt: now,
    });
    return item.id;
  });
  return readItem(db, itemId, language);
}

/** One item, for members and buyers of its group (BR-12, BR-13). */
export async function getItem(
  db: Database,
  userId: string,
  itemId: string,
  language: Language,
): Promise<ItemView> {
  const item = await loadItem(db, itemId);
  if (!item) throw new NotAvailableError();
  await resolveGroupAccess(db, userId, item.groupId);
  return readItem(db, itemId, language);
}

/** After a conditional change matched nothing: gone, or changed (BR-20). */
async function refusal(db: Database, itemId: string) {
  return (await loadItem(db, itemId))
    ? new ItemChangedError()
    : new NotAvailableError();
}

/**
 * Edits an item for a member, at the version they last saw (BR-20), while
 * BR-19 allows it. A reserved item keeps its buyer and is marked as updated;
 * an unavailable item returns to pending without a buyer, which is recorded.
 */
export async function updateItem(
  db: Database,
  clock: Clock,
  userId: string,
  itemId: string,
  input: UpdateItemInput,
  language: Language,
): Promise<ItemView> {
  const item = await loadItem(db, itemId);
  if (!item) throw new NotAvailableError();
  await requireMemberAccess(db, userId, item.groupId);
  if (item.version !== input.version || !EDITABLE.includes(item.status)) {
    throw new ItemChangedError();
  }
  await checkRecipient(db, item.groupId, input.recipientId);
  await checkTargetList(db, item.groupId, input.listId);

  const now = clock();
  const changes: Partial<typeof items.$inferInsert> = {
    ...(input.name !== undefined && { name: input.name }),
    ...(input.recipientId !== undefined && { recipientId: input.recipientId }),
    // A new or cleared link drops what was looked up for the old one (BR-21);
    // the same link sent again keeps it.
    ...(input.url !== undefined &&
      input.url !== item.url && {
        url: input.url,
        storeName: null,
        thumbnailUrl: null,
        linkStatus: "none",
      }),
    ...(input.quantity !== undefined && { quantity: input.quantity }),
    ...(input.notes !== undefined && { notes: input.notes }),
    ...(input.listId !== undefined && { listId: input.listId }),
    version: item.version + 1,
    updatedAt: now,
    ...(item.status === "reserved" && { updatedAfterReservation: true }),
    ...(item.status === "unavailable" && {
      status: "pending",
      buyerId: null,
      buyerNote: null,
      unavailableNote: null,
      updatedAfterReservation: false,
    }),
  };

  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(items)
      .set(changes)
      .where(
        and(
          eq(items.id, itemId),
          eq(items.version, item.version),
          eq(items.status, item.status),
        ),
      )
      .returning({ id: items.id });
    if (!row) return false;
    if (item.status === "unavailable") {
      await tx.insert(statusHistory).values({
        itemId,
        fromStatus: "unavailable",
        toStatus: "pending",
        authorId: userId,
        createdAt: now,
      });
    }
    return true;
  });
  if (!updated) throw await refusal(db, itemId);
  return readItem(db, itemId, language);
}

/** Deletes a pending or unavailable item for a member (BR-19). */
export async function deleteItem(
  db: Database,
  userId: string,
  itemId: string,
): Promise<void> {
  const item = await loadItem(db, itemId);
  if (!item) throw new NotAvailableError();
  await requireMemberAccess(db, userId, item.groupId);
  const deleted = await db
    .delete(items)
    .where(and(eq(items.id, itemId), inArray(items.status, [...DELETABLE])))
    .returning({ id: items.id });
  if (deleted.length === 0) throw await refusal(db, itemId);
}
