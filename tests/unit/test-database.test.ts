import { describe, expect, it } from "vitest";

import { TEST_DATABASE_NAME, testDatabaseUrl } from "../support/test-database";

describe("testDatabaseUrl", () => {
  it("replaces the database name and keeps the rest of the address", () => {
    expect(
      testDatabaseUrl("postgres://user:secret@localhost:5432/comproparati"),
    ).toBe(`postgres://user:secret@localhost:5432/${TEST_DATABASE_NAME}`);
  });

  it.each(["localhost", "127.0.0.1", "[::1]"])(
    "accepts the local host %s",
    (host) => {
      expect(testDatabaseUrl(`postgres://user@${host}/comproparati`)).toContain(
        TEST_DATABASE_NAME,
      );
    },
  );

  it.each([
    "db.example.com",
    "ep-cool-name.neon.tech",
    "localhost.example.com",
  ])("refuses the remote host %s", (host) => {
    expect(() =>
      testDatabaseUrl(`postgres://user@${host}/comproparati`),
    ).toThrow("only run against a local database");
  });

  it.each(["host=db.neon.tech", "hostaddr=203.0.113.1", "service=production"])(
    "refuses a local address with the %s parameter",
    (parameter) => {
      expect(() =>
        testDatabaseUrl(`postgres://user@localhost/comproparati?${parameter}`),
      ).toThrow("only run against a local database");
    },
  );

  it("keeps parameters that don't change the host", () => {
    expect(
      testDatabaseUrl("postgres://user@localhost/comproparati?sslmode=disable"),
    ).toBe(`postgres://user@localhost/${TEST_DATABASE_NAME}?sslmode=disable`);
  });

  it("refuses a missing address", () => {
    expect(() => testDatabaseUrl(undefined)).toThrow("DATABASE_URL is not set");
  });

  it("refuses an invalid address", () => {
    expect(() => testDatabaseUrl("not an address")).toThrow(
      "not a valid address",
    );
  });
});
