import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Loads apps/api/.env (gitignored) into process.env for local dev, using Node's
 * built-in loader — no dotenv dependency. Variables already set in the shell win,
 * since process.loadEnvFile never overrides existing ones. Imported first by main.ts
 * because some modules (clerk-client.ts) read process.env as soon as they're imported;
 * tests never import main.ts, so they're unaffected.
 */
const envFile = join(__dirname, '..', '.env');

if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}
