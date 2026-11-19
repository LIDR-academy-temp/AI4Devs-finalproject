import { existsSync } from "node:fs";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
import type { TestProject } from "vitest/node";

import { testDatabaseUrl } from "./test-database";

declare module "vitest" {
  export interface ProvidedContext {
    testDatabaseUrl: string;
  }
}

/** Runs once before the integration tests: finds the test database and migrates it. */
export default async function setup(project: TestProject) {
  if (existsSync(".env")) {
    process.loadEnvFile();
  }
  const url = testDatabaseUrl(process.env.DATABASE_URL);

  const client = new Client({ connectionString: url });
  try {
    await client.connect();
  } catch (error) {
    throw new Error(
      "Couldn't connect to the test database. Start Postgres with `docker compose up -d --wait`, " +
        "and run `npm run setup` if the test database doesn't exist yet.",
      { cause: error },
    );
  }

  try {
    await migrate(drizzle(client), {
      migrationsFolder: "src/server/db/migrations",
    });
  } finally {
    await client.end();
  }

  project.provide("testDatabaseUrl", url);
}
