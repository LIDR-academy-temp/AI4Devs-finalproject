import { describe } from "vitest";

import { defineDatabaseIsolationTests } from "../support/database-isolation";

describe("Integration test files don't see each other's data (second file)", () => {
  defineDatabaseIsolationTests();
});
