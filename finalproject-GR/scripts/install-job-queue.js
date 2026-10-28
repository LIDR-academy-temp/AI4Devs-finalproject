// Installs or updates Graphile Worker's own `graphile_worker` schema (ADR 0018) against
// DATABASE_URL, which must be railgun_migrator so the migrator owns it. Idempotent.
// apply-migrations.js runs this before the SQL files, because 0014 grants on its objects;
// for an existing dev database, run it on its own:
//   DATABASE_URL=postgresql://railgun_migrator:migrator_dev_password@localhost:5433/railgun node scripts/install-job-queue.js
const { runMigrations } = require('graphile-worker');

async function installJobQueue(connectionString) {
  await runMigrations({ connectionString });
}

module.exports = { installJobQueue };

if (require.main === module) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL must be set');
    process.exitCode = 1;
  } else {
    installJobQueue(connectionString)
      .then(() => console.log('Installed the graphile_worker schema'))
      .catch((err) => {
        console.error(err);
        process.exitCode = 1;
      });
  }
}
