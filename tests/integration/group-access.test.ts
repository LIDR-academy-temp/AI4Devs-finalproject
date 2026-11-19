import { randomUUID } from "node:crypto";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, describe, expect, it } from "vitest";

import { seedIds } from "../../scripts/seed-data";
import * as schema from "../../src/server/db/schema";
import {
  requireMemberAccess,
  resolveGroupAccess,
} from "../../src/server/services/access";
import {
  ForbiddenError,
  NotAvailableError,
} from "../../src/server/services/errors";

// Verifies the membership check against the seed (docs/04-DATA-MODEL.md, section 3).

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });
afterAll(() => pool.end());

const { users, groups } = seedIds;

describe("resolveGroupAccess", () => {
  it("BR-12 a member's access resolves as member", async () => {
    await expect(
      resolveGroupAccess(db, users.ana, groups.garcia),
    ).resolves.toEqual({
      groupId: groups.garcia,
      userId: users.ana,
      type: "member",
    });
  });

  it("BR-12 a buyer's access resolves as buyer", async () => {
    await expect(
      resolveGroupAccess(db, users.juan, groups.garcia),
    ).resolves.toMatchObject({ type: "buyer" });
  });

  it("BR-12 an ended membership gives no access", async () => {
    await expect(
      resolveGroupAccess(db, users.pedro, groups.garcia),
    ).rejects.toBeInstanceOf(NotAvailableError);
  });

  it("BR-13 a missing group, another group, and a malformed ID are refused the same way", async () => {
    for (const groupId of [randomUUID(), groups.perez, "not-a-uuid"]) {
      await expect(
        resolveGroupAccess(db, users.ana, groupId),
      ).rejects.toBeInstanceOf(NotAvailableError);
    }
  });

  it("BR-12 a user in two groups gets each group's own role", async () => {
    // Luis is a buyer in the García Group and owns the Pérez Group.
    await expect(
      resolveGroupAccess(db, users.luis, groups.garcia),
    ).resolves.toMatchObject({ type: "buyer" });
    await expect(
      resolveGroupAccess(db, users.luis, groups.perez),
    ).resolves.toMatchObject({ type: "member" });
  });
});

describe("requireMemberAccess", () => {
  it("BR-12 a buyer is refused a member-only action", async () => {
    await expect(
      requireMemberAccess(db, users.juan, groups.garcia),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("BR-12 a member passes a member-only check", async () => {
    await expect(
      requireMemberAccess(db, users.rosa, groups.garcia),
    ).resolves.toMatchObject({ type: "member" });
  });

  it("BR-13 a non-member is refused as not available, not forbidden", async () => {
    await expect(
      requireMemberAccess(db, users.ana, groups.perez),
    ).rejects.toBeInstanceOf(NotAvailableError);
  });
});
