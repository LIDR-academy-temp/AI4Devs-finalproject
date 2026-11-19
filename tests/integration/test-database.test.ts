import { Client } from "pg";
import { expect, it } from "vitest";

import { TEST_DATABASE_NAME } from "../support/test-database";

it("connects to the test database", async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query<{ name: string }>(
      "SELECT current_database() AS name",
    );
    expect(result.rows[0]?.name).toBe(TEST_DATABASE_NAME);
  } finally {
    await client.end();
  }
});
