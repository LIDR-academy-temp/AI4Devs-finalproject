import { z } from "zod";

// Invitation codes (docs/04-DATA-MODEL.md, section 2): 256 random bits written
// as 43 URL-safe characters. Shared, so the server and the pages that carry a
// code in their address check it the same way.

export const INVITATION_CODE_LENGTH = 43;

export const invitationCode = z
  .string()
  .regex(new RegExp(`^[A-Za-z0-9_-]{${INVITATION_CODE_LENGTH}}$`));

/** True when the value has the shape of an invitation code. */
export function isInvitationCode(value: unknown): value is string {
  return invitationCode.safeParse(value).success;
}

/** The address of the Invitation screen for a code (docs/02-UX-DESIGN.md, section 1, flow C). */
export function invitationPath(code: string): string {
  return `/invitations/${code}`;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/**
 * Whole days until the invitation expires, rounded to the nearest day and
 * never below 0, for "Expires today", "in 1 day", and "in {count} days".
 */
export function daysUntil(expiresAt: Date, now: Date): number {
  return Math.max(
    0,
    Math.round((expiresAt.getTime() - now.getTime()) / DAY_IN_MS),
  );
}
