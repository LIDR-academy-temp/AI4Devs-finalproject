// Applies a plain SQL file against DATABASE_URL. Used both for the base migration and
// for the local/CI role-setup script — migrations here are plain SQL, independent of
// the ORM (ADR 0003's own precedent), so no migration framework is introduced for this.
const fs = require('fs');
const { Client } = require('pg');

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node apply-sql.js <path-to-sql-file>');
    process.exitCode = 1;
    return;
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL must be set');
    process.exitCode = 1;
    return;
  }
  const sql = fs.readFileSync(file, 'utf8');
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query(sql);
    console.log(`Applied ${file}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
