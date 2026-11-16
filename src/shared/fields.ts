import { parsePhoneNumberFromString } from "libphonenumber-js";
import { z } from "zod";

import { fieldLimits } from "./limits";

// One Zod schema per field limit in BR-32. Endpoint schemas are built from these,
// so the browser and the server validate with the same rules (FR-39).

function text(limits: { min?: number; max: number }) {
  const base = z.string().trim();
  return limits.min === undefined
    ? base.max(limits.max)
    : base.min(limits.min).max(limits.max);
}

const { recipientDetails } = fieldLimits;

export const fields = {
  /** Names of items, lists, groups, and recipients; address label; receiver's name. */
  name: text(fieldLimits.name),
  /** The optional name of the person invited; blank means none (FR-06). */
  inviteeName: text(fieldLimits.inviteeName).transform(
    (value) => value || undefined,
  ),
  /** Item notes, recipient notes, buyer note, and the "Couldn't buy it" note. */
  note: text(fieldLimits.note),
  quantity: z
    .number()
    .int()
    .min(fieldLimits.quantity.min)
    .max(fieldLimits.quantity.max),
  recipientDetails: z
    .array(
      z.object({
        name: text(recipientDetails.name),
        value: text(recipientDetails.value),
      }),
    )
    .max(recipientDetails.maxCount),
  link: z.url({ protocol: /^https?$/ }).max(fieldLimits.link.max),
  agency: text(fieldLimits.agency),
  deliveryAddress: text(fieldLimits.deliveryAddress),
  /** A valid international number, stored in E.164 (for example +12025550101). */
  phone: z.string().transform((value, context) => {
    const number = parsePhoneNumberFromString(value.trim());
    if (!number?.isValid()) {
      context.addIssue({ code: "custom", message: "invalid" });
      return z.NEVER;
    }
    return number.number;
  }),
};

/** What went wrong with a field, as the error format's `fields` reports it. */
export type FieldError =
  "required" | "too_short" | "too_long" | "too_small" | "too_big" | "invalid";

function valueAt(input: unknown, path: readonly PropertyKey[]): unknown {
  let value = input;
  for (const key of path) {
    if (value === null || typeof value !== "object") return undefined;
    value = (value as Record<PropertyKey, unknown>)[key];
  }
  return value;
}

function fieldError(issue: z.core.$ZodIssue, input: unknown): FieldError {
  switch (issue.code) {
    case "invalid_type": {
      const value = valueAt(input, issue.path);
      return value === undefined || value === null ? "required" : "invalid";
    }
    case "too_small":
      if (issue.origin === "string") {
        return issue.minimum === 1 ? "required" : "too_short";
      }
      return "too_small";
    case "too_big":
      return issue.origin === "string" ? "too_long" : "too_big";
    default:
      return "invalid";
  }
}

/**
 * Turns a validation failure into the error format's `fields`: each failing
 * field's path, joined with dots, and the first thing wrong with it.
 */
export function fieldErrors(
  error: z.ZodError,
  input: unknown,
): Record<string, FieldError> {
  const result: Record<string, FieldError> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "body";
    result[key] ??= fieldError(issue, input);
  }
  return result;
}
