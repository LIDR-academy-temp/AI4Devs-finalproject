import { beforeAll, inject } from "vitest";

import { resetDatabase } from "./reset-database";

// Code under test reads DATABASE_URL, so point it at the test database first.
process.env.DATABASE_URL = inject("testDatabaseUrl");

// Runs once for each test file (docs/07-SECURITY-AND-TESTING.md, section 2.3).
beforeAll(resetDatabase);
