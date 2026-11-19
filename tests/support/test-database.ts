export const TEST_DATABASE_NAME = "comproparati_test";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
// The Postgres driver lets `host` override the address's host. It ignores the other
// two, but libpq tools such as psql read them, so they are refused as well.
const HOST_PARAMETERS = ["host", "hostaddr", "service"];

/**
 * The address of the test database, derived from DATABASE_URL. Refuses any host
 * other than the local machine, however it is given, so tests can never reach
 * production data (docs/07-SECURITY-AND-TESTING.md, section 2.3).
 */
export function testDatabaseUrl(databaseUrl: string | undefined): string {
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Run `npm run setup` to create .env.",
    );
  }

  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL is not a valid address.");
  }

  if (!LOCAL_HOSTS.has(url.hostname)) {
    throw new Error(
      `Tests only run against a local database, and DATABASE_URL points to ${url.hostname}.`,
    );
  }

  const parameter = HOST_PARAMETERS.find((name) => url.searchParams.has(name));
  if (parameter) {
    throw new Error(
      `Tests only run against a local database, and DATABASE_URL sets the ${parameter} parameter.`,
    );
  }

  url.pathname = `/${TEST_DATABASE_NAME}`;
  return url.toString();
}
