import { existsSync } from "node:fs";

import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";

import * as schema from "../src/server/db/schema";
import { testDatabaseUrl } from "../tests/support/test-database";
import { loadSeedData } from "./seed-data";

// Seed data is for the local environment only (docs/06-INFRASTRUCTURE.md, section 2).
function refuseRemoteDatabase(connectionString: string) {
  try {
    testDatabaseUrl(connectionString);
  } catch (error) {
    throw new Error("The seed only loads into a local database.", {
      cause: error,
    });
  }
}

async function main() {
  if (existsSync(".env")) {
    process.loadEnvFile();
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Run `npm run setup` to create .env.",
    );
  }
  refuseRemoteDatabase(connectionString);

  const client = new Client({ connectionString });
  await client.connect();
  try {
    await loadSeedData(drizzle(client, { schema }));
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
