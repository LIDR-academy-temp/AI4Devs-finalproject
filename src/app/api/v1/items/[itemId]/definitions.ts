import { z } from "zod";

import { routeDefinition } from "@/server/http/route";
import { itemSchema, updateItemRequestSchema } from "@/server/http/schemas";
import { deleteItem, getItem, updateItem } from "@/server/services/items";

// One item (docs/05-API.md, section 2).

const params = z.object({ itemId: z.uuid() });

export const getItemById = routeDefinition({
  method: "GET",
  path: "/items/{itemId}",
  summary: "One item, for members and buyers of its group (BR-12)",
  params,
  response: itemSchema,
  handler: async ({ params }, { db, user, language }) =>
    getItem(db, user.id, params.itemId, language),
});

export const patchItem = routeDefinition({
  method: "PATCH",
  path: "/items/{itemId}",
  summary:
    "Edit or move an item. Members only, while pending, reserved, or unavailable (BR-19), at the version last seen (BR-20).",
  params,
  body: updateItemRequestSchema,
  response: itemSchema,
  errors: ["FORBIDDEN", "ITEM_CHANGED"],
  handler: async ({ params, body }, { db, clock, user, language }) =>
    updateItem(db, clock, user.id, params.itemId, body, language),
});

export const deleteItemById = routeDefinition({
  method: "DELETE",
  path: "/items/{itemId}",
  summary:
    "Delete an item. Members only, while pending or unavailable (BR-19).",
  params,
  errors: ["FORBIDDEN", "ITEM_CHANGED"],
  handler: async ({ params }, { db, user }) =>
    deleteItem(db, user.id, params.itemId),
});
