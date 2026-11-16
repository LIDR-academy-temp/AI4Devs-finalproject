import { describe, expect, it } from "vitest";

import {
  daysUntil,
  invitationPath,
  isInvitationCode,
} from "../../src/shared/invitations";

// The expiry shown for an invitation and the shape of its code (FR-06, BR-08;
// docs/04-DATA-MODEL.md, section 2).

const now = new Date("2026-11-15T12:00:00Z");
const HOUR_IN_MS = 60 * 60 * 1000;
const after = (hours: number) => new Date(now.getTime() + hours * HOUR_IN_MS);

describe("daysUntil", () => {
  it("T-08 a new invitation expires in 7 days", () => {
    expect(daysUntil(after(7 * 24), now)).toBe(7);
    expect(daysUntil(after(7 * 24 - 1), now)).toBe(7);
  });

  it("T-08 one day left reads 1 day", () => {
    expect(daysUntil(after(24), now)).toBe(1);
    expect(daysUntil(after(13), now)).toBe(1);
  });

  it("T-08 under 12 hours left reads today", () => {
    expect(daysUntil(after(11), now)).toBe(0);
    expect(daysUntil(after(0.5), now)).toBe(0);
  });

  it("T-08 an expiry in the past never goes below 0", () => {
    expect(daysUntil(after(-48), now)).toBe(0);
  });
});

describe("invitation codes", () => {
  it("T-08 a code is 43 URL-safe characters", () => {
    expect(isInvitationCode("A".repeat(43))).toBe(true);
    expect(isInvitationCode("aZ09-_".padEnd(43, "x"))).toBe(true);
    expect(isInvitationCode("A".repeat(42))).toBe(false);
    expect(isInvitationCode("A".repeat(44))).toBe(false);
    expect(isInvitationCode("/".padEnd(43, "x"))).toBe(false);
    expect(isInvitationCode("https://evil.example/".padEnd(43, "x"))).toBe(
      false,
    );
    expect(isInvitationCode(undefined)).toBe(false);
  });

  it("T-08 the Invitation screen's address holds the code", () => {
    expect(invitationPath("A".repeat(43))).toBe(
      `/invitations/${"A".repeat(43)}`,
    );
  });
});
