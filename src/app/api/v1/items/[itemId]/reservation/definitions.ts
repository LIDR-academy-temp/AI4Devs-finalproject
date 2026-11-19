import { z } from "zod";

import { routeDefinition } from "@/server/http/route";
import { itemSchema } from "@/server/http/schemas";
import { releaseItem, reserveItem } from "@/server/services/item-status";

// Reserving and releasing an item (docs/05-API.md, sections 2 and 3).

const params = z.object({ itemId: z.uuid() });

export const postReservation = routeDefinition({
  method: "POST",
  path: "/items/{itemId}/reservation",
  summary:
    'Reserve an item ("I\'ll buy it"). Members and buyers of its group, only while it is pending; the first of two simultaneous requests wins (BR-23).',
  params,
  response: itemSchema,
  errors: ["ALREADY_RESERVED", "ITEM_CHANGED"],
  handler: async ({ params }, { db, clock, user, language }) =>
    reserveItem(db, clock, user.id, params.itemId, language),
});

export const deleteReservation = routeDefinition({
  method: "DELETE",
  path: "/items/{itemId}/reservation",
  summary:
    "Release a reservation. Only the item's buyer, while it is reserved (FR-24, BR-12).",
  params,
  response: itemSchema,
  errors: ["ITEM_CHANGED"],
  handler: async ({ params }, { db, clock, user, language }) =>
    releaseItem(db, clock, user.id, params.itemId, language),
});
