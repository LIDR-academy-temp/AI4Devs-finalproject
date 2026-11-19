import { and, eq, exists, inArray } from "drizzle-orm";

import type { Language } from "../../shared/languages";
import type { Clock } from "../clock";
import type { Database } from "../db/client";
import { items, users } from "../db/schema";
import { NotAvailableError } from "./errors";
import { isInvitationCode } from "../../shared/invitations";
import { listGroups, startWithoutInvitationIn } from "./groups";
import { isUsableInvitationCode } from "./invitations";
import type { MembershipType } from "./access";

// The signed-in user, their memberships, and whether they have purchases, which
// together decide the screens they see (FR-08); and the user's own changes:
// completing onboarding (FR-02) and their profile (FR-04).

export type CurrentUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  language: Language | null;
  whatsappNumber: string | null;
  receiveEmails: boolean;
  onboarded: boolean;
  hasPurchases: boolean;
  memberships: {
    groupId: string;
    groupName: string;
    type: MembershipType;
    isOwner: boolean;
  }[];
};

export async function getCurrentUser(
  db: Database,
  userId: string,
): Promise<CurrentUser> {
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      language: users.language,
      whatsappNumber: users.whatsappNumber,
      receiveEmails: users.receiveEmails,
      onboardedAt: users.onboardedAt,
      hasPurchases: exists(
        db
          .select({ id: items.id })
          .from(items)
          .where(
            and(
              eq(items.buyerId, users.id),
              inArray(items.status, ["reserved", "purchased"]),
            ),
          ),
      ),
    })
    .from(users)
    .where(eq(users.id, userId));
  // A session belongs to an existing user; a deleted account has no sessions.
  if (!user) throw new NotAvailableError();

  const groups = await listGroups(db, userId);
  const { onboardedAt, ...account } = user;
  return {
    ...account,
    hasPurchases: Boolean(account.hasPurchases),
    onboarded: onboardedAt !== null,
    memberships: groups.map((group) => ({
      groupId: group.id,
      groupName: group.name,
      type: group.type,
      isOwner: group.isOwner,
    })),
  };
}

export type OnboardingAnswers = {
  language: Language;
  /** Already in E.164, from the shared request schema (BR-04, BR-32). */
  whatsappNumber: string;
  /** The invitation the user signs up through, if any (BR-06). */
  invitationCode?: string | undefined;
};

/**
 * Completes onboarding (FR-02): saves the language, the WhatsApp number, and
 * when the terms were accepted (BR-01), then runs getting started (BR-06), all
 * in one transaction with the user's row locked. Getting started is skipped
 * when the user signs up through a usable invitation, which they then accept
 * or decline. For a user who has already completed onboarding, changes
 * nothing. Returns the current user either way.
 */
export async function completeOnboarding(
  db: Database,
  clock: Clock,
  userId: string,
  answers: OnboardingAnswers,
): Promise<CurrentUser> {
  await db.transaction(async (tx) => {
    const [user] = await tx
      .select({ onboardedAt: users.onboardedAt })
      .from(users)
      .where(eq(users.id, userId))
      .for("update");
    if (!user) throw new NotAvailableError();
    if (user.onboardedAt) return;

    const now = clock();
    await tx
      .update(users)
      .set({
        language: answers.language,
        whatsappNumber: answers.whatsappNumber,
        termsAcceptedAt: now,
        onboardedAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, userId));
    const { invitationCode } = answers;
    const throughInvitation =
      isInvitationCode(invitationCode) &&
      (await isUsableInvitationCode(tx, now, invitationCode));
    if (!throughInvitation) {
      await startWithoutInvitationIn(tx, clock, userId, answers.language);
    }
  });
  return getCurrentUser(db, userId);
}

export type ProfileChanges = {
  language?: Language;
  /** E.164; the number can be changed but not removed (BR-04). */
  whatsappNumber?: string;
  receiveEmails?: boolean;
};

/** Changes the user's language, WhatsApp number, or email setting (FR-04). */
export async function updateProfile(
  db: Database,
  clock: Clock,
  userId: string,
  changes: ProfileChanges,
): Promise<CurrentUser> {
  const values = Object.fromEntries(
    Object.entries(changes).filter(([, value]) => value !== undefined),
  ) as ProfileChanges;
  await db
    .update(users)
    .set({ ...values, updatedAt: clock() })
    .where(eq(users.id, userId));
  return getCurrentUser(db, userId);
}
