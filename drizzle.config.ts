import { existsSync } from "node:fs";

import { defineConfig } from "drizzle-kit";

if (existsSync(".env")) {
  process.loadEnvFile();
}

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Run `npm run setup` to create .env.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./src/server/db/migrations",
  dbCredentials: { url },
});
