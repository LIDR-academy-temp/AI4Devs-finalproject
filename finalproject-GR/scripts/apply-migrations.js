// Applies every db/migrations/*.up.sql file in filename order, against DATABASE_URL.
// Generalizes what used to be a single hardcoded migration filename in CI — that broke
// silently as soon as a second migration existed (discovered while adding one).
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  const dir = path.join(__dirname, '..', 'db', 'migrations');
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.up.sql'))
    .sort();

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL must be set');
    process.exitCode = 1;
    return;
  }

  const client = new Client({ connectionString });
  await client.connect();
  try {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      await client.query(sql);
      console.log(`Applied ${file}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
