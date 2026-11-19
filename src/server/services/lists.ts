import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import type { Clock } from "../clock";
import type { Database } from "../db/client";
import { lists } from "../db/schema";
import {
  type GroupAccess,
  requireMemberAccess,
  resolveGroupAccess,
} from "./access";
import { NotAvailableError } from "./errors";

// A group's lists (FR-11, FR-12). Archived lists are hidden everywhere (BR-17)
// and answer like missing ones (BR-13).

export type ListSummary = { id: string; name: string };

const uuid = z.uuid();

/** The list's group, or null when the ID is malformed, missing, or archived. */
export async function loadList(
  db: Database,
  listId: string,
): Promise<{ id: string; groupId: string } | null> {
  if (!uuid.safeParse(listId).success) return null;
  const [list] = await db
    .select({ id: lists.id, groupId: lists.groupId })
    .from(lists)
    .where(and(eq(lists.id, listId), isNull(lists.archivedAt)));
  return list ?? null;
}

/**
 * The list and the user's access to its group. Members and buyers read; only
 * members change (BR-12). Anything else is not available (BR-13).
 */
export async function requireListAccess(
  db: Database,
  userId: string,
  listId: string,
  need: "read" | "change",
): Promise<{ list: { id: string; groupId: string }; access: GroupAccess }> {
  const list = await loadList(db, listId);
  if (!list) throw new NotAvailableError();
  const access =
    need === "change"
      ? await requireMemberAccess(db, userId, list.groupId)
      : await resolveGroupAccess(db, userId, list.groupId);
  return { list, access };
}

/** The group's lists that aren't archived, oldest first. */
export async function listLists(
  db: Database,
  userId: string,
  groupId: string,
): Promise<ListSummary[]> {
  await resolveGroupAccess(db, userId, groupId);
  return db
    .select({ id: lists.id, name: lists.name })
    .from(lists)
    .where(and(eq(lists.groupId, groupId), isNull(lists.archivedAt)))
    .orderBy(asc(lists.createdAt), asc(lists.id));
}

/** Creates a list in the group, for a member (FR-12). */
export async function createList(
  db: Database,
  clock: Clock,
  userId: string,
  groupId: string,
  input: { name: string },
): Promise<ListSummary> {
  await requireMemberAccess(db, userId, groupId);
  const now = clock();
  const [list] = await db
    .insert(lists)
    .values({ groupId, name: input.name, createdAt: now, updatedAt: now })
    .returning({ id: lists.id, name: lists.name });
  if (!list) throw new Error("The list insert returned no row.");
  return list;
}
