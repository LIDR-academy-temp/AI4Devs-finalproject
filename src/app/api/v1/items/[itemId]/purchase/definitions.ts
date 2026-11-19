import { z } from "zod";

import { routeDefinition } from "@/server/http/route";
import { itemSchema, purchaseRequestSchema } from "@/server/http/schemas";
import { purchaseItem } from "@/server/services/item-status";

// Marking an item as purchased (docs/05-API.md, section 2).

const params = z.object({ itemId: z.uuid() });

export const postPurchase = routeDefinition({
  method: "POST",
  path: "/items/{itemId}/purchase",
  summary:
    'Mark an item as purchased ("I bought it"), with an optional buyer note. Only the item\'s buyer, while it is reserved (FR-25, BR-12, BR-25).',
  params,
  // The note is optional, so the body is too.
  body: purchaseRequestSchema.optional(),
  response: itemSchema,
  errors: ["ITEM_CHANGED"],
  handler: async ({ params, body }, { db, clock, user, language }) =>
    purchaseItem(db, clock, user.id, params.itemId, body ?? {}, language),
});
