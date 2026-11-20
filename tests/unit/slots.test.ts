import { describe, expect, it } from "vitest";
import { computeAvailableSlots, rangesOverlap } from "../../lib/services/slots";

const DAY = new Date("2026-11-20T00:00:00");

describe("computeAvailableSlots", () => {
  it("returns every slot that fits inside the availability window", () => {
    const slots = computeAvailableSlots({
      date: DAY,
      availability: [{ startTime: "09:00", endTime: "10:00" }],
      durationMinutes: 30,
      existingAppointments: [],
    });

    expect(slots).toEqual(["09:00", "09:30"]);
  });

  it("excludes a slot that would overlap an existing appointment", () => {
    const slots = computeAvailableSlots({
      date: DAY,
      availability: [{ startTime: "09:00", endTime: "10:00" }],
      durationMinutes: 30,
      existingAppointments: [
        { startAt: new Date("2026-11-20T09:30:00"), endAt: new Date("2026-11-20T10:00:00") },
      ],
    });

    expect(slots).toEqual(["09:00"]);
  });

  it("does not offer a slot that would run past the closing time", () => {
    const slots = computeAvailableSlots({
      date: DAY,
      availability: [{ startTime: "09:00", endTime: "09:45" }],
      durationMinutes: 30,
      existingAppointments: [],
    });

    // 09:00-09:30 fits; 09:30-10:00 would end after 09:45, so it must not appear.
    expect(slots).toEqual(["09:00"]);
  });

  it("excludes slots that already started relative to `now`", () => {
    const slots = computeAvailableSlots({
      date: DAY,
      availability: [{ startTime: "09:00", endTime: "11:00" }],
      durationMinutes: 30,
      existingAppointments: [],
      now: new Date("2026-11-20T10:00:00"),
    });

    expect(slots).toEqual(["10:00", "10:30"]);
  });

  it("returns no slots when there is no availability configured", () => {
    const slots = computeAvailableSlots({
      date: DAY,
      availability: [],
      durationMinutes: 30,
      existingAppointments: [],
    });

    expect(slots).toEqual([]);
  });
});

describe("rangesOverlap", () => {
  it("detects a partial overlap", () => {
    const a = [new Date("2026-11-20T09:00:00"), new Date("2026-11-20T09:30:00")] as const;
    const b = [new Date("2026-11-20T09:15:00"), new Date("2026-11-20T09:45:00")] as const;
    expect(rangesOverlap(a[0], a[1], b[0], b[1])).toBe(true);
  });

  it("treats back-to-back ranges as non-overlapping", () => {
    const a = [new Date("2026-11-20T09:00:00"), new Date("2026-11-20T09:30:00")] as const;
    const b = [new Date("2026-11-20T09:30:00"), new Date("2026-11-20T10:00:00")] as const;
    expect(rangesOverlap(a[0], a[1], b[0], b[1])).toBe(false);
  });
});
