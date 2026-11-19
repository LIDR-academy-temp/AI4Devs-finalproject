import { and, eq } from "drizzle-orm";
import { z } from "zod";

import type { Database } from "../db/client";
import { memberships } from "../db/schema";
import { ForbiddenError, NotAvailableError } from "./errors";

// The membership check every service runs before it reads or changes a group's
// data (BR-12). Services that own lists, items, and other resources find the
// owning group in their own query, then call this.

export type MembershipType = "member" | "buyer";

export type GroupAccess = {
  groupId: string;
  userId: string;
  type: MembershipType;
};

const uuid = z.uuid();

/**
 * The user's active membership in the group, or NotAvailableError when the
 * group doesn't exist, the user isn't in it, or the ID isn't a UUID. All three
 * look the same, so a request reveals nothing about other groups (BR-13).
 */
export async function resolveGroupAccess(
  db: Database,
  userId: string,
  groupId: string,
): Promise<GroupAccess> {
  if (!uuid.safeParse(groupId).success) throw new NotAvailableError();

  const [membership] = await db
    .select({ type: memberships.type })
    .from(memberships)
    .where(
      and(
        eq(memberships.groupId, groupId),
        eq(memberships.userId, userId),
        eq(memberships.status, "active"),
      ),
    )
    .limit(1);

  if (!membership) throw new NotAvailableError();
  return { groupId, userId, type: membership.type };
}

/**
 * Like resolveGroupAccess, for actions only members can take. A buyer of the
 * group gets ForbiddenError: they can see the data, but not take the action.
 */
export async function requireMemberAccess(
  db: Database,
  userId: string,
  groupId: string,
): Promise<GroupAccess> {
  const access = await resolveGroupAccess(db, userId, groupId);
  if (access.type !== "member") throw new ForbiddenError();
  return access;
}
