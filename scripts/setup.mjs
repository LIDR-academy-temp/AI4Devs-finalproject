// Prepares a fresh clone for development and testing. Runs before node_modules
// exists, so it starts with Node's built-in modules only. Every step can be
// repeated safely. Commands: docs/07-SECURITY-AND-TESTING.md, section 2.5.
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);

function stop(message) {
  console.error(`\nSetup stopped: ${message}`);
  process.exit(1);
}

function step(message) {
  console.log(`\n> ${message}`);
}

function run(command, args, hint = "") {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    stop(`\`${command} ${args.join(" ")}\` failed.${hint}`);
  }
}

function checkPrerequisites() {
  const required = Number(readFileSync(".nvmrc", "utf8").trim());
  const current = Number(process.versions.node.split(".")[0]);
  if (current < required) {
    stop(
      `Node.js ${required} or newer is required, and this is ${process.version}.`,
    );
  }

  const docker = spawnSync("docker", ["info"], {
    stdio: "ignore",
    shell: process.platform === "win32",
  });
  if (docker.status !== 0) {
    stop(
      "Docker isn't running. Install or start Docker, then run this command again.",
    );
  }

  const compose = spawnSync("docker", ["compose", "version"], {
    stdio: "ignore",
    shell: process.platform === "win32",
  });
  if (compose.status !== 0) {
    stop(
      "Docker Compose isn't available. Install it, then run this command again.",
    );
  }
}

async function createTestDatabase() {
  const { default: pg } = await import("pg");
  const { TEST_DATABASE_NAME, testDatabaseUrl } =
    await import("../tests/support/test-database.ts");

  // Refuses a remote DATABASE_URL before anything is created on that server.
  testDatabaseUrl(process.env.DATABASE_URL);

  // Connects to the development database, because the test database may not exist yet.
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const existing = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [TEST_DATABASE_NAME],
    );
    if (existing.rowCount === 0) {
      await client.query(`CREATE DATABASE ${TEST_DATABASE_NAME}`);
    }
  } finally {
    await client.end();
  }
}

checkPrerequisites();

step("Creating .env");
if (existsSync(".env")) {
  console.log(".env already exists, so it was left unchanged.");
} else {
  copyFileSync(".env.example", ".env");
}
process.loadEnvFile();

step("Installing dependencies");
run("npm", ["ci"]);

step("Starting Postgres");
run(
  "docker",
  ["compose", "up", "-d", "--wait"],
  " Check that nothing else is using port 5432.",
);

step("Creating the test database");
await createTestDatabase();

step("Applying migrations and seed data");
run("npm", ["run", "db:migrate"]);
run("npm", ["run", "db:seed"]);

step("Installing the browsers for the browser tests");
run("npx", ["playwright", "install", "chromium", "webkit"]);

console.log("\nSetup finished. Run `npm run dev` to start the app.");
