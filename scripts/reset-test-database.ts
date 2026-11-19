import { existsSync } from "node:fs";

import { resetDatabase } from "../tests/support/reset-database";

// Browser test runs start from a freshly seeded database, in the order the server command
// needs: after migrations, before the app starts.
if (existsSync(".env")) {
  process.loadEnvFile();
}

resetDatabase().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
