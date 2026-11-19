import { randomBytes } from "node:crypto";

import { and, asc, eq, gt } from "drizzle-orm";
import { z } from "zod";

import type { Language } from "../../shared/languages";
import type { Clock } from "../clock";
import type { Database, Transaction } from "../db/client";
import { groups, invitations, memberships, users } from "../db/schema";
import { type MembershipType, requireMemberAccess } from "./access";
import {
  InvitationInvalidError,
  NotAvailableError,
  RuleViolationError,
} from "./errors";
import { startWithoutInvitationIn } from "./groups";
import { personName } from "./people";

// Invitations (FR-06, FR-17): members create, list, and cancel them; the person
// with the link sees, accepts, or declines one (BR-06, BR-08, BR-09, BR-12).
// An invitation is usable while it is pending and its expiry is after the
// clock's time; everything here goes through that one check.

const LIFETIME_IN_MS = 7 * 24 * 60 * 60 * 1000;

export type InvitationSummary = {
  id: string;
  type: MembershipType;
  inviteeName: string | null;
  expiresAt: string;
};

export type CreatedInvitation = InvitationSummary & { code: string };

export type InvitationPreview = {
  inviterName: string;
  groupName: string;
  type: MembershipType;
  /** The signed-in user already has the access the invitation gives (BR-09). */
  alreadyInGroup: boolean;
};

export type AcceptedInvitation = { groupId: string; type: MembershipType };

type Executor = Database | Transaction;

const uuid = z.uuid();

/** 256 random bits as 43 URL-safe characters (docs/04-DATA-MODEL.md, section 2). */
function newCode(): string {
  return randomBytes(32).toString("base64url");
}

function isUsable(
  invitation: { status: string; expiresAt: Date },
  now: Date,
): boolean {
  return (
    invitation.status === "pending" &&
    invitation.expiresAt.getTime() > now.getTime()
  );
}

const usableAt = (now: Date) =>
  and(eq(invitations.status, "pending"), gt(invitations.expiresAt, now));

function summary(row: {
  id: string;
  type: MembershipType;
  inviteeName: string | null;
  expiresAt: Date;
}): InvitationSummary {
  return {
    id: row.id,
    type: row.type,
    inviteeName: row.inviteeName,
    expiresAt: row.expiresAt.toISOString(),
  };
}

/** Whether an active membership already gives what the invitation would (BR-09). */
function alreadyHasAccess(
  membership: { type: MembershipType; status: string } | undefined,
  invitationType: MembershipType,
): boolean {
  if (membership?.status !== "active") return false;
  return membership.type === "member" || invitationType === "buyer";
}

/** Creates a pending invitation that expires in 7 days. Members only (BR-08, BR-12). */
export async function createInvitation(
  db: Database,
  clock: Clock,
  userId: string,
  groupId: string,
  input: { type: MembershipType; inviteeName?: string | undefined },
): Promise<CreatedInvitation> {
  await requireMemberAccess(db, userId, groupId);
  const now = clock();
  const [row] = await db
    .insert(invitations)
    .values({
      groupId,
      type: input.type,
      inviteeName: input.inviteeName ?? null,
      code: newCode(),
      createdBy: userId,
      expiresAt: new Date(now.getTime() + LIFETIME_IN_MS),
      createdAt: now,
    })
    .returning();
  if (!row) throw new Error("The invitation insert returned no row.");
  return { ...summary(row), code: row.code };
}

/** The group's usable invitations, oldest first, without their codes. Members only. */
export async function listInvitations(
  db: Database,
  clock: Clock,
  userId: string,
  groupId: string,
): Promise<InvitationSummary[]> {
  await requireMemberAccess(db, userId, groupId);
  const rows = await db
    .select({
      id: invitations.id,
      type: invitations.type,
      inviteeName: invitations.inviteeName,
      expiresAt: invitations.expiresAt,
    })
    .from(invitations)
    .where(and(eq(invitations.groupId, groupId), usableAt(clock())))
    .orderBy(asc(invitations.createdAt), asc(invitations.id));
  return rows.map(summary);
}

/**
 * Cancels a usable invitation. Members of its group only (BR-12); anyone else
 * gets the "not available" of a missing one (BR-13), and an invitation that is
 * no longer usable is refused as invalid (BR-08).
 */
export async function cancelInvitation(
  db: Database,
  clock: Clock,
  userId: string,
  invitationId: string,
): Promise<void> {
  if (!uuid.safeParse(invitationId).success) throw new NotAvailableError();
  const [invitation] = await db
    .select({ groupId: invitations.groupId })
    .from(invitations)
    .where(eq(invitations.id, invitationId));
  if (!invitation) throw new NotAvailableError();
  await requireMemberAccess(db, userId, invitation.groupId);

  const cancelled = await db
    .update(invitations)
    .set({ status: "cancelled" })
    .where(and(eq(invitations.id, invitationId), usableAt(clock())))
    .returning({ id: invitations.id });
  if (cancelled.length === 0) throw new InvitationInvalidError();
}

/**
 * What the person with the link sees: who invites them, to which group, and as
 * what (FR-06), and, when signed in, whether they already have that access
 * (BR-09). Needs no sign-in, so it reveals nothing else about the group.
 */
export async function previewInvitation(
  db: Database,
  clock: Clock,
  code: string,
  userId: string | null,
  language: Language,
): Promise<InvitationPreview> {
  const [row] = await db
    .select({
      groupId: invitations.groupId,
      type: invitations.type,
      status: invitations.status,
      expiresAt: invitations.expiresAt,
      groupName: groups.name,
      inviter: {
        name: users.name,
        email: users.email,
        deletedAt: users.deletedAt,
      },
    })
    .from(invitations)
    .innerJoin(groups, eq(groups.id, invitations.groupId))
    .innerJoin(users, eq(users.id, invitations.createdBy))
    .where(eq(invitations.code, code));
  if (!row) throw new NotAvailableError();
  if (!isUsable(row, clock())) throw new InvitationInvalidError();

  let alreadyInGroup = false;
  if (userId) {
    const [membership] = await db
      .select({ type: memberships.type, status: memberships.status })
      .from(memberships)
      .where(
        and(
          eq(memberships.groupId, row.groupId),
          eq(memberships.userId, userId),
        ),
      );
    alreadyInGroup = alreadyHasAccess(membership, row.type);
  }

  return {
    inviterName: personName(row.inviter, language),
    groupName: row.groupName,
    type: row.type,
    alreadyInGroup,
  };
}

type LockedInvitation = {
  id: string;
  groupId: string;
  type: MembershipType;
};

/**
 * Locks the invitation for the rest of the transaction and checks that the
 * user can use it: it exists (BR-13), is usable (BR-08), and gives the user
 * access they don't have yet (BR-09). Returns their membership in the group,
 * also locked, if they have one.
 */
async function lockForUse(
  tx: Transaction,
  now: Date,
  userId: string,
  code: string,
) {
  const [invitation] = await tx
    .select({
      id: invitations.id,
      groupId: invitations.groupId,
      type: invitations.type,
      status: invitations.status,
      expiresAt: invitations.expiresAt,
    })
    .from(invitations)
    .where(eq(invitations.code, code))
    .for("update");
  if (!invitation) throw new NotAvailableError();
  if (!isUsable(invitation, now)) throw new InvitationInvalidError();

  const [membership] = await tx
    .select({
      id: memberships.id,
      type: memberships.type,
      status: memberships.status,
    })
    .from(memberships)
    .where(
      and(
        eq(memberships.groupId, invitation.groupId),
        eq(memberships.userId, userId),
      ),
    )
    .for("update");
  if (alreadyHasAccess(membership, invitation.type)) {
    throw new RuleViolationError("ALREADY_IN_GROUP");
  }

  const locked: LockedInvitation = {
    id: invitation.id,
    groupId: invitation.groupId,
    type: invitation.type,
  };
  return { invitation: locked, membership };
}

/**
 * Accepts the invitation: the user joins its group with its type, a buyer
 * becomes a member, or an ended membership is active again, and the
 * invitation is used up (FR-06, BR-08, BR-09). The locked invitation row makes
 * a second, concurrent accept wait and then find it used.
 */
export async function acceptInvitation(
  db: Database,
  clock: Clock,
  userId: string,
  code: string,
): Promise<AcceptedInvitation> {
  return db.transaction(async (tx) => {
    const now = clock();
    const { invitation, membership } = await lockForUse(tx, now, userId, code);

    if (!membership) {
      // Another accept by the same user, of another invitation to this group,
      // may have added the membership meanwhile: then this one is refused.
      const inserted = await tx
        .insert(memberships)
        .values({
          groupId: invitation.groupId,
          userId,
          type: invitation.type,
          joinedAt: now,
        })
        .onConflictDoNothing({
          target: [memberships.groupId, memberships.userId],
        })
        .returning({ id: memberships.id });
      if (inserted.length === 0) {
        throw new RuleViolationError("ALREADY_IN_GROUP");
      }
    } else if (membership.status === "ended") {
      await tx
        .update(memberships)
        .set({
          type: invitation.type,
          status: "active",
          joinedAt: now,
          endedAt: null,
        })
        .where(eq(memberships.id, membership.id));
    } else {
      // An active buyer accepting a member invitation (BR-09).
      await tx
        .update(memberships)
        .set({ type: invitation.type })
        .where(eq(memberships.id, membership.id));
    }

    await tx
      .update(invitations)
      .set({ status: "accepted", acceptedBy: userId, acceptedAt: now })
      .where(eq(invitations.id, invitation.id));

    return { groupId: invitation.groupId, type: invitation.type };
  });
}

/**
 * Declines the invitation, which uses it up (BR-08). A user who has never had
 * a membership then gets their own group and first list (BR-06), named in
 * their language.
 */
export async function declineInvitation(
  db: Database,
  clock: Clock,
  userId: string,
  code: string,
  language: Language,
): Promise<void> {
  await db.transaction(async (tx) => {
    const now = clock();
    const { invitation } = await lockForUse(tx, now, userId, code);
    await tx
      .update(invitations)
      .set({ status: "declined" })
      .where(eq(invitations.id, invitation.id));
    await startWithoutInvitationIn(tx, clock, userId, language);
  });
}

/**
 * Whether the code names a usable invitation, so onboarding skips getting
 * started for a user who signs up through it (BR-06). Reads without a lock.
 */
export async function isUsableInvitationCode(
  db: Executor,
  now: Date,
  code: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: invitations.id })
    .from(invitations)
    .where(and(eq(invitations.code, code), usableAt(now)))
    .limit(1);
  return Boolean(row);
}
