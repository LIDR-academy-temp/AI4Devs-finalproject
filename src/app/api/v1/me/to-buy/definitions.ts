import { routeDefinition } from "@/server/http/route";
import {
  buyerItemCollectionSchema,
  toBuyFiltersSchema,
} from "@/server/http/schemas";
import { listToBuy } from "@/server/services/buyer-items";

// To buy (docs/05-API.md, section 2).

export const getToBuy = routeDefinition({
  method: "GET",
  path: "/me/to-buy",
  summary:
    "Pending items in all the user's groups, each with its list and group, filterable by group and list (FR-21)",
  query: toBuyFiltersSchema,
  response: buyerItemCollectionSchema,
  handler: async ({ query }, { db, user, language }) => ({
    items: await listToBuy(db, user.id, query, language),
  }),
});
