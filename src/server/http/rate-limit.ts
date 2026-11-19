import type { RateLimit } from "../../shared/limits";
import type { Clock } from "../clock";
import type { Database } from "../db/client";
import { incrementRateLimitCounter } from "../db/rate-limits";
import { RequestError } from "./errors";

// Counters per user, action, and fixed time window, stored in Postgres
// (docs/07-SECURITY-AND-TESTING.md, section 1).

export function rateLimitWindow(now: Date, windowSeconds: number) {
  const size = windowSeconds * 1000;
  const start = Math.floor(now.getTime() / size) * size;
  return { start: new Date(start), end: new Date(start + size) };
}

export function rateLimitKey(
  userId: string,
  action: string,
  windowStart: Date,
) {
  return `${action}:${userId}:${windowStart.toISOString()}`;
}

/** Counts the request, and throws RATE_LIMITED when it goes over the limit. */
export async function enforceRateLimit(
  db: Database,
  clock: Clock,
  userId: string,
  limit: RateLimit,
): Promise<void> {
  const window = rateLimitWindow(clock(), limit.windowSeconds);
  const count = await incrementRateLimitCounter(
    db,
    rateLimitKey(userId, limit.action, window.start),
    window.end,
  );
  if (count > limit.limit) throw new RequestError("RATE_LIMITED");
}
