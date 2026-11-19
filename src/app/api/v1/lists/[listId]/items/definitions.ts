import { z } from "zod";

import { routeDefinition } from "@/server/http/route";
import {
  createItemRequestSchema,
  itemCollectionSchema,
  itemFiltersSchema,
  itemSchema,
} from "@/server/http/schemas";
import { createItem, listItems } from "@/server/services/items";
import { rateLimits } from "@/shared/limits";

// The items in a list (docs/05-API.md, sections 2 and 3).

const params = z.object({ listId: z.uuid() });

export const getListItems = routeDefinition({
  method: "GET",
  path: "/lists/{listId}/items",
  summary:
    "Items in a list, for members and buyers, filterable by recipient (`none` for no recipient) and status (FR-11)",
  params,
  query: itemFiltersSchema,
  response: itemCollectionSchema,
  handler: async ({ params, query }, { db, user, language }) => ({
    items: await listItems(db, user.id, params.listId, query, language),
  }),
});

export const postListItem = routeDefinition({
  method: "POST",
  path: "/lists/{listId}/items",
  summary:
    "Create an item. Members only. A name is enough (quick add), and the item starts as pending (FR-13).",
  params,
  body: createItemRequestSchema,
  response: itemSchema,
  successStatus: 201,
  rateLimit: rateLimits.createItem,
  errors: ["FORBIDDEN"],
  handler: async ({ params, body }, { db, clock, user, language }) =>
    createItem(db, clock, user.id, params.listId, body, language),
});
