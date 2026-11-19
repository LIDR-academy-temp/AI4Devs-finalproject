import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { afterAll, beforeAll, expect, it } from "vitest";

import { seedIds } from "../../scripts/seed-data";
import * as schema from "../../src/server/db/schema";
import { createGroup } from "./factories";
import { dumpDatabase, resetDatabase } from "./reset-database";

/**
 * Two test files call this. They run one at a time in either order, and each changes the
 * data, so whichever runs second proves that the first one's changes are gone.
 */
export function defineDatabaseIsolationTests() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(client, { schema });

  beforeAll(() => client.connect());
  afterAll(() => client.end());

  it("starts from exactly the seed data", async () => {
    const atStart = await dumpDatabase(client);
    await resetDatabase();
    expect(atStart).toEqual(await dumpDatabase(client));
  });

  it("leaves added and changed rows behind for the next file", async () => {
    await createGroup(db, { ownerId: seedIds.users.ana });
    await db
      .update(schema.items)
      .set({ name: "Changed by a test" })
      .where(eq(schema.items.id, seedIds.items.pending));
  });
}
