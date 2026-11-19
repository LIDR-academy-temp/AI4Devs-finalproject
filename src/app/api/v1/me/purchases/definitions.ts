import { routeDefinition } from "@/server/http/route";
import { buyerItemCollectionSchema } from "@/server/http/schemas";
import { listPurchases } from "@/server/services/buyer-items";

// My purchases (docs/05-API.md, section 2).

export const getPurchases = routeDefinition({
  method: "GET",
  path: "/me/purchases",
  summary:
    "The user's reserved and purchased items, each with its list and group, including purchased items in a group they left (FR-21, BR-11)",
  response: buyerItemCollectionSchema,
  handler: async (_input, { db, user, language }) => ({
    items: await listPurchases(db, user.id, language),
  }),
});
