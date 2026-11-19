import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import * as schema from "../../src/server/db/schema";
import { createUser } from "../support/factories";
import { emptyDatabase, resetDatabase } from "../support/reset-database";
import { TEST_DATABASE_NAME } from "../support/test-database";

// A database other than the test one that exists everywhere, including the CI container.
function otherDatabaseUrl() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  url.pathname = "/postgres";
  return url.toString();
}

describe("Development data is never emptied", () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(client, { schema });

  beforeAll(() => client.connect());
  afterAll(() => client.end());

  it("the reset reaches the test database whatever DATABASE_URL holds", async () => {
    const leftOver = await createUser(db);
    const testDatabaseAddress = process.env.DATABASE_URL;

    process.env.DATABASE_URL = otherDatabaseUrl();
    try {
      await resetDatabase();
    } finally {
      process.env.DATABASE_URL = testDatabaseAddress;
    }

    const { rows } = await client.query("SELECT id FROM users WHERE id = $1", [
      leftOver.id,
    ]);
    expect(rows).toEqual([]);
  });

  it("emptying refuses any database but the test one", async () => {
    const other = new Client({ connectionString: otherDatabaseUrl() });
    await other.connect();
    try {
      await expect(emptyDatabase(other)).rejects.toThrow(
        `Only ${TEST_DATABASE_NAME} can be emptied`,
      );
    } finally {
      await other.end();
    }
  });
});
