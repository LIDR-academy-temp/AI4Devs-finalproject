import { createFormatter } from "next-intl";
import { describe, expect, it } from "vitest";

import { calendarDate, formats, TIME_ZONE } from "../../src/i18n/formats";

// Dates and numbers follow the user's language (FR-38), with the formats the
// app's pages use (src/i18n/request.ts).

function formatter(locale: "es" | "en") {
  return createFormatter({ locale, timeZone: TIME_ZONE, formats });
}

const shipDate = calendarDate("2026-10-18");

describe("formats", () => {
  it("AC-99 dates and numbers use the English format", () => {
    const format = formatter("en");
    expect(format.dateTime(shipDate, "short")).toBe("10/18/2026");
    expect(format.dateTime(shipDate, "long")).toBe("October 18, 2026");
    expect(format.number(8, "integer")).toBe("8");
    expect(format.number(1250, "integer")).toBe("1,250");
  });

  it("FR-38 dates and numbers use the Spanish format", () => {
    const format = formatter("es");
    expect(format.dateTime(shipDate, "short")).toBe("18/10/2026");
    expect(format.dateTime(shipDate, "long")).toBe("18 de octubre de 2026");
    expect(format.number(8, "integer")).toBe("8");
    expect(format.number(12500, "integer")).toBe("12.500");
  });

  it("FR-38 a calendar date shows the same day everywhere", () => {
    const original = process.env.TZ;
    try {
      for (const zone of ["America/Havana", "Asia/Tokyo", "UTC"]) {
        process.env.TZ = zone;
        expect(
          formatter("es").dateTime(calendarDate("2026-10-18"), "long"),
        ).toBe("18 de octubre de 2026");
        expect(calendarDate("2026-01-01").toISOString()).toBe(
          "2026-01-01T00:00:00.000Z",
        );
      }
    } finally {
      process.env.TZ = original;
    }
  });

  it("FR-38 a value that isn't a calendar date is refused", () => {
    expect(() => calendarDate("18/10/2026")).toThrow(RangeError);
  });
});
