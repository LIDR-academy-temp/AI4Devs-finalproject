import { routeDefinition } from "@/server/http/route";
import { groupListSchema } from "@/server/http/schemas";
import { listGroups } from "@/server/services/groups";

// The user's groups (docs/05-API.md, section 2).

export const getGroups = routeDefinition({
  method: "GET",
  path: "/groups",
  summary: "The groups the user belongs to, with their role in each",
  response: groupListSchema,
  handler: async (_input, { db, user }) => ({
    groups: await listGroups(db, user.id),
  }),
});
