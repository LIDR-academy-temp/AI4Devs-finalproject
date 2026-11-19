import { z } from "zod";

import { routeDefinition } from "@/server/http/route";
import { groupSchema } from "@/server/http/schemas";
import { getGroup } from "@/server/services/groups";

// One group with its members and buyers (docs/05-API.md, section 2).

export const getGroupById = routeDefinition({
  method: "GET",
  path: "/groups/{groupId}",
  summary: "The group with its members and buyers. Members only (BR-12).",
  params: z.object({ groupId: z.uuid() }),
  response: groupSchema,
  errors: ["FORBIDDEN"],
  handler: async ({ params }, { db, user, language }) =>
    getGroup(db, user.id, params.groupId, language),
});
