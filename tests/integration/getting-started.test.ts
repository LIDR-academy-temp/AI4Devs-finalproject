import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { seedIds } from "../../scripts/seed-data";
import en from "../../src/i18n/en.json";
import es from "../../src/i18n/es.json";
import { groups, lists, memberships } from "../../src/server/db/schema";
import { startWithoutInvitation } from "../../src/server/services/groups";
import { createMembership, createUser } from "../support/factories";
import { createTestDatabase, testClock } from "../support/routes";

// Getting started (BR-06), which T-04's onboarding endpoint calls.

const { pool, db } = createTestDatabase();
afterAll(() => pool.end());

const NOW = new Date("2026-11-10T09:30:00Z");
const { clock } = testClock(NOW);

async function groupsOwnedBy(userId: string) {
  return db.select().from(groups).where(eq(groups.ownerId, userId));
}

async function listsOf(groupId: string) {
  return db.select().from(lists).where(eq(lists.groupId, groupId));
}

describe("startWithoutInvitation", () => {
  it("AC-01 a new user without an invitation gets a group they own and a first list", async () => {
    const user = await createUser(db, { name: "Marta López" });

    const started = await startWithoutInvitation(db, clock, user.id, "en");

    const [group] = await groupsOwnedBy(user.id);
    expect(group).toMatchObject({
      id: started?.groupId,
      name: "Marta's group",
      ownerId: user.id,
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(
      await db
        .select()
        .from(memberships)
        .where(eq(memberships.userId, user.id)),
    ).toEqual([
      expect.objectContaining({
        groupId: group?.id,
        type: "member",
        status: "active",
        joinedAt: NOW,
      }),
    ]);
    expect(await listsOf(group!.id)).toEqual([
      expect.objectContaining({
        id: started?.listId,
        name: en.groups.startingListName,
        archivedAt: null,
        createdAt: NOW,
      }),
    ]);
  });

  it("BR-06 names follow the user's language", async () => {
    const spanish = await createUser(db, { name: "Rocío Díaz" });
    const english = await createUser(db, { name: "Mary Smith" });

    const inSpanish = await startWithoutInvitation(db, clock, spanish.id, "es");
    const inEnglish = await startWithoutInvitation(db, clock, english.id, "en");

    const [spanishGroup] = await groupsOwnedBy(spanish.id);
    const [englishGroup] = await groupsOwnedBy(english.id);
    expect(spanishGroup?.name).toBe(
      es.groups.startingGroupName.replace("{firstName}", "Rocío"),
    );
    expect(englishGroup?.name).toBe(
      en.groups.startingGroupName.replace("{firstName}", "Mary"),
    );
    expect((await listsOf(inSpanish!.groupId))[0]?.name).toBe(
      es.groups.startingListName,
    );
    expect((await listsOf(inEnglish!.groupId))[0]?.name).toBe(
      en.groups.startingListName,
    );
  });

  it("BR-06 a user who already has a membership gets no group of their own", async () => {
    // Juan joined the García Group by invitation; Pedro's membership has ended.
    for (const userId of [seedIds.users.juan, seedIds.users.pedro]) {
      await expect(
        startWithoutInvitation(db, clock, userId, "es"),
      ).resolves.toBeNull();
      expect(await groupsOwnedBy(userId)).toEqual([]);
    }

    const invited = await createUser(db, { name: "Elena" });
    await createMembership(db, {
      groupId: seedIds.groups.garcia,
      userId: invited.id,
      type: "buyer",
    });
    await expect(
      startWithoutInvitation(db, clock, invited.id, "es"),
    ).resolves.toBeNull();
    expect(await groupsOwnedBy(invited.id)).toEqual([]);
  });

  it("BR-06 running getting started twice creates one group", async () => {
    const oneAfterTheOther = await createUser(db, { name: "Sara" });
    expect(
      await startWithoutInvitation(db, clock, oneAfterTheOther.id, "en"),
    ).not.toBeNull();
    expect(
      await startWithoutInvitation(db, clock, oneAfterTheOther.id, "en"),
    ).toBeNull();
    expect(await groupsOwnedBy(oneAfterTheOther.id)).toHaveLength(1);

    // The pool gives each transaction its own connection.
    const atTheSameTime = await createUser(db, { name: "Tomás" });
    const results = await Promise.all([
      startWithoutInvitation(db, clock, atTheSameTime.id, "es"),
      startWithoutInvitation(db, clock, atTheSameTime.id, "es"),
    ]);
    expect(results.filter((result) => result !== null)).toHaveLength(1);
    const owned = await groupsOwnedBy(atTheSameTime.id);
    expect(owned).toHaveLength(1);
    expect(await listsOf(owned[0]!.id)).toHaveLength(1);
  });

  it("BR-32 a very long first name is shortened to fit", async () => {
    const firstName = "Á".repeat(100);
    const user = await createUser(db, { name: firstName });

    await startWithoutInvitation(db, clock, user.id, "en");

    const [group] = await groupsOwnedBy(user.id);
    expect(Array.from(group!.name).length).toBeLessThanOrEqual(100);
    expect(group!.name.startsWith("ÁÁÁ")).toBe(true);
    expect(group!.name.endsWith("'s group")).toBe(true);
  });

  it("BR-06 a user with no name is named from their email", async () => {
    const user = await createUser(db, {
      name: "  ",
      email: "ana.garcia@example.com",
    });

    await startWithoutInvitation(db, clock, user.id, "en");

    const [group] = await groupsOwnedBy(user.id);
    expect(group?.name).toBe("ana.garcia's group");
  });

  it("BR-06 refuses a user who doesn't exist", async () => {
    await expect(
      startWithoutInvitation(
        db,
        clock,
        "00000000-0000-4000-8000-999999999999",
        "en",
      ),
    ).rejects.toThrow();
  });
});
