import { z } from "zod";

import { fields } from "./fields";
import { LANGUAGES } from "./languages";

// Request bodies and queries, built from the BR-32 fields, so the browser and
// the server validate the same way (FR-39).

/** One last step (FR-02, FR-03): language, WhatsApp number (BR-04), and the age and terms box (BR-01). */
export const onboardingRequestShape = {
  language: z.enum(LANGUAGES),
  whatsappNumber: fields.phone,
  /** The "I am 18 or older and accept the terms" box, which must be checked. */
  acceptsTerms: z.literal(true),
  /**
   * The invitation the user is signing up through, if any (BR-06). A code that
   * isn't usable, or isn't shaped like one, is ignored, never refused.
   */
  invitationCode: z.string().optional().meta({
    description:
      "The invitation the user signs up through; a pending invitation that hasn't expired skips getting started (BR-06). Any other value is ignored.",
  }),
};

export const onboardingRequest = z.object(onboardingRequestShape);

/** A new invitation (FR-06): its type, and the optional name of the person invited (BR-32). */
export const createInvitationRequestShape = {
  type: z.enum(["member", "buyer"]),
  inviteeName: fields.inviteeName.optional(),
};

export const createInvitationRequest = z.object(createInvitationRequestShape);

/** Profile (FR-04). The WhatsApp number can be changed but not removed (BR-04). */
export const updateMeRequestShape = {
  language: z.enum(LANGUAGES).optional(),
  whatsappNumber: fields.phone.optional(),
  receiveEmails: z.boolean().optional(),
};

/** True when the request names at least one field. */
export function namesAField(body: Record<string, unknown>) {
  return Object.values(body).some((value) => value !== undefined);
}

export const updateMeRequest = z
  .object(updateMeRequestShape)
  .refine(namesAField, { message: "nothing to change" });

export const ITEM_STATUSES = [
  "pending",
  "reserved",
  "purchased",
  "shipped",
  "unavailable",
] as const;

export type ItemStatus = (typeof ITEM_STATUSES)[number];

/** Optional text: empty after trimming means no value. */
const optionalNote = fields.note
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .optional();

export const createListRequestShape = { name: fields.name };

export const createListRequest = z.object(createListRequestShape);

export const createItemRequestShape = {
  name: fields.name,
  recipientId: z.uuid().nullable().optional(),
  url: fields.link.nullable().optional(),
  quantity: fields.quantity.default(1),
  notes: optionalNote,
};

export const createItemRequest = z.object(createItemRequestShape);

export const updateItemRequestShape = {
  /** The version the member last saw (BR-20). */
  version: z.number().int().min(1),
  name: fields.name.optional(),
  recipientId: z.uuid().nullable().optional(),
  url: fields.link.nullable().optional(),
  quantity: fields.quantity.optional(),
  notes: optionalNote,
  /** Another list of the same group (FR-16). */
  listId: z.uuid().optional(),
};

/** True when the edit changes something besides the version. */
export function changesSomething(body: Record<string, unknown>) {
  return Object.entries(body).some(
    ([key, value]) => key !== "version" && value !== undefined,
  );
}

export const updateItemRequest = z
  .object(updateItemRequestShape)
  .refine(changesSomething, { message: "nothing to change" });

export const itemFiltersShape = {
  /** A recipient's ID, or `none` for items with no recipient. */
  recipientId: z.union([z.uuid(), z.literal("none")]).optional(),
  status: z.enum(ITEM_STATUSES).optional(),
};

export const itemFilters = z.object(itemFiltersShape);

/** Mark as purchased (FR-25): an optional buyer note (BR-25, BR-32). */
export const purchaseRequestShape = { buyerNote: optionalNote };

/** To buy (FR-21): filter by group, by list, or both. */
export const toBuyFiltersShape = {
  groupId: z.uuid().optional(),
  listId: z.uuid().optional(),
};
