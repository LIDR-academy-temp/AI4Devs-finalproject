// CI/dev check (ADR 0003): fails the build if any table with a workspace_id column
// lacks forced RLS plus at least one policy. Run with `npm run db:check-rls`.
const { Client } = require('pg');

const QUERY = `
  SELECT c.relname AS missing_table
  FROM information_schema.columns col
  JOIN pg_namespace n ON n.nspname = col.table_schema
  JOIN pg_class c ON c.relname = col.table_name AND c.relnamespace = n.oid AND c.relkind = 'r'
  WHERE col.column_name = 'workspace_id'
    AND col.table_schema = 'public'
    AND (
      NOT c.relrowsecurity
      OR NOT c.relforcerowsecurity
      OR NOT EXISTS (
        SELECT 1 FROM pg_policies p WHERE p.schemaname = n.nspname AND p.tablename = c.relname
      )
    );
`;

async function main() {
  const connectionString = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/railgun';
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const { rows } = await client.query(QUERY);
    if (rows.length > 0) {
      console.error('RLS coverage check FAILED. Tables with a workspace_id column missing forced RLS and/or a policy:');
      for (const row of rows) console.error(`  - ${row.missing_table}`);
      process.exitCode = 1;
      return;
    }
    console.log('RLS coverage check passed: every workspace_id table has forced RLS and at least one policy.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
