import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

/** The handle a transaction's callback receives, for services that join a caller's transaction. */
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool, { schema });
