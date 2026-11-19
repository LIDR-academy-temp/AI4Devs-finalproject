import { describe, expect, it } from "vitest";
import { z } from "zod";

import { fieldErrors, fields } from "../../src/shared/fields";

// Verifies the field limits in BR-32 (docs/01-PRD.md, section 12).

function accepts(schema: z.ZodType, value: unknown) {
  return schema.safeParse(value).success;
}

function errorFor(schema: z.ZodType, value: unknown) {
  const body = { field: value };
  const result = z.object({ field: schema }).safeParse(body);
  if (result.success) throw new Error("expected the value to be rejected");
  return fieldErrors(result.error, body).field;
}

// The limits are written out from BR-32, not read from src/shared/limits.ts, so a
// changed constant fails here instead of moving the test along with it.
const textFields = [
  ["name", fields.name, 100],
  ["shipping agency", fields.agency, 80],
  ["delivery address", fields.deliveryAddress, 500],
  ["recipient detail name", fields.recipientDetails.element.shape.name, 40],
  ["recipient detail value", fields.recipientDetails.element.shape.value, 150],
] as const;

describe("BR-32 field limits", () => {
  it.each(textFields)(
    "BR-32 %s accepts its maximum length and rejects one more",
    (_label, schema, max) => {
      expect(accepts(schema, "a".repeat(max))).toBe(true);
      expect(errorFor(schema, "a".repeat(max + 1))).toBe("too_long");
    },
  );

  it.each(textFields)(
    "BR-32 %s is required: empty or blank text is rejected",
    (_label, schema) => {
      expect(accepts(schema, "a")).toBe(true);
      expect(errorFor(schema, "")).toBe("required");
      expect(errorFor(schema, "   ")).toBe("required");
      expect(errorFor(schema, undefined)).toBe("required");
    },
  );

  it("BR-32 notes accept 1,000 characters and reject 1,001", () => {
    expect(accepts(fields.note, "")).toBe(true);
    expect(accepts(fields.note, "a".repeat(1000))).toBe(true);
    expect(errorFor(fields.note, "a".repeat(1001))).toBe("too_long");
  });

  it("BR-32 the invitee name is optional and accepts up to 100 characters", () => {
    expect(fields.inviteeName.parse("  Carlos ")).toBe("Carlos");
    expect(fields.inviteeName.parse("")).toBeUndefined();
    expect(fields.inviteeName.parse("   ")).toBeUndefined();
    expect(accepts(fields.inviteeName, "a".repeat(100))).toBe(true);
    expect(errorFor(fields.inviteeName, "a".repeat(101))).toBe("too_long");
  });

  it("BR-32 quantity accepts 1 to 99", () => {
    expect(accepts(fields.quantity, 1)).toBe(true);
    expect(accepts(fields.quantity, 99)).toBe(true);
    expect(errorFor(fields.quantity, 0)).toBe("too_small");
    expect(errorFor(fields.quantity, 100)).toBe("too_big");
    expect(errorFor(fields.quantity, 1.5)).toBe("invalid");
    expect(errorFor(fields.quantity, "2")).toBe("invalid");
  });

  it("BR-32 a recipient has at most 20 details", () => {
    const detail = { name: "Shoe", value: "4" };
    expect(accepts(fields.recipientDetails, Array(20).fill(detail))).toBe(true);
    expect(errorFor(fields.recipientDetails, Array(21).fill(detail))).toBe(
      "too_big",
    );
  });

  it("BR-32 text is trimmed before it is measured", () => {
    expect(fields.name.parse("  Shoes  ")).toBe("Shoes");
    expect(accepts(fields.name, ` ${"a".repeat(100)} `)).toBe(true);
  });
});

describe("BR-32 links", () => {
  it("BR-32 links must be http or https", () => {
    expect(accepts(fields.link, "https://www.example.com/shoes?size=4")).toBe(
      true,
    );
    expect(accepts(fields.link, "http://example.com")).toBe(true);
    for (const link of [
      "ftp://example.com/file",
      "javascript:alert(1)",
      "data:text/html,hi",
      "example.com",
    ]) {
      expect(errorFor(fields.link, link)).toBe("invalid");
    }
  });

  it("BR-32 links accept 2,000 characters and reject 2,001", () => {
    const prefix = "https://example.com/";
    const atLimit = prefix + "a".repeat(2000 - prefix.length);
    expect(accepts(fields.link, atLimit)).toBe(true);
    expect(errorFor(fields.link, `${atLimit}a`)).toBe("too_long");
  });
});

describe("BR-32 phone numbers", () => {
  it("BR-32 phone numbers must be valid international numbers", () => {
    expect(fields.phone.parse("+12025550101")).toBe("+12025550101");
    expect(fields.phone.parse("+53 5 123 4567")).toBe("+5351234567");
    for (const phone of ["2025550101", "+1 555", "+999 123", "phone", ""]) {
      expect(errorFor(fields.phone, phone)).toBe("invalid");
    }
  });

  it("BR-32 a number given with spaces is stored in E.164", () => {
    expect(fields.phone.parse(" +1 (202) 555-0101 ")).toBe("+12025550101");
  });
});

describe("fieldErrors", () => {
  it("names each failing field by its path, with the first problem found", () => {
    const schema = z.object({
      name: fields.name,
      details: fields.recipientDetails,
    });
    const body = { details: [{ name: "Shoe", value: "a".repeat(151) }] };
    const result = schema.safeParse(body);
    expect(result.success).toBe(false);
    expect(fieldErrors(result.error!, body)).toEqual({
      name: "required",
      "details.0.value": "too_long",
    });
  });
});
