import { getTableName, is } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { PgTable } from "drizzle-orm/pg-core";
import { Client } from "pg";

import { loadSeedData } from "../../scripts/seed-data";
import * as schema from "../../src/server/db/schema";
import { TEST_DATABASE_NAME, testDatabaseUrl } from "./test-database";

const TABLES = Object.values(schema)
  .filter((value) => is(value, PgTable))
  .map((table) => getTableName(table));

/**
 * Empties every table, and refuses any database but the test one. Migration records live
 * in the `drizzle` schema and aren't touched.
 */
export async function emptyDatabase(client: Client) {
  const { rows } = await client.query<{ name: string }>(
    "SELECT current_database() AS name",
  );
  const database = rows[0]?.name;
  if (database !== TEST_DATABASE_NAME) {
    throw new Error(
      `Only ${TEST_DATABASE_NAME} can be emptied, and this is connected to ${database}.`,
    );
  }

  const tables = TABLES.map((table) => `"${table}"`).join(", ");
  await client.query(`TRUNCATE ${tables} CASCADE`);
}

/**
 * Empties the test database and loads the seed again (docs/07-SECURITY-AND-TESTING.md,
 * section 2.3). The address is always derived here, whatever DATABASE_URL holds, so this
 * can't reach the development database or a remote one.
 */
export async function resetDatabase() {
  const client = new Client({
    connectionString: testDatabaseUrl(process.env.DATABASE_URL),
  });
  await client.connect();
  try {
    await emptyDatabase(client);
    await loadSeedData(drizzle(client, { schema }));
  } finally {
    await client.end();
  }
}

/** Every row of every table, in a stable order, for comparing two states of the database. */
export async function dumpDatabase(client: Client) {
  const dump: Record<string, unknown[]> = {};
  for (const table of TABLES) {
    // The primary key is the first column of every table.
    const result = await client.query(`SELECT * FROM "${table}" ORDER BY 1`);
    dump[table] = result.rows;
  }
  return dump;
}
