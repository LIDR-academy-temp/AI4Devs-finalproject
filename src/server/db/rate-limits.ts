import { sql } from "drizzle-orm";

import type { Database } from "./client";
import { rateLimits } from "./schema";

/**
 * Adds one to the counter for `key` and returns the new count. One statement
 * inserts or increments, so simultaneous requests are all counted.
 */
export async function incrementRateLimitCounter(
  db: Database,
  key: string,
  expiresAt: Date,
): Promise<number> {
  const [row] = await db
    .insert(rateLimits)
    .values({ key, count: 1, expiresAt })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: { count: sql`${rateLimits.count} + 1` },
    })
    .returning({ count: rateLimits.count });
  return row.count;
}
