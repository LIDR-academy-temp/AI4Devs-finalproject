import { z } from "zod";

import { routeDefinition } from "@/server/http/route";
import {
  createListRequestSchema,
  listCollectionSchema,
  listSchema,
} from "@/server/http/schemas";
import { createList, listLists } from "@/server/services/lists";

// A group's lists (docs/05-API.md, section 2).

const params = z.object({ groupId: z.uuid() });

export const getLists = routeDefinition({
  method: "GET",
  path: "/groups/{groupId}/lists",
  summary:
    "The group's lists that aren't archived, for members and buyers (BR-12)",
  params,
  response: listCollectionSchema,
  handler: async ({ params }, { db, user }) => ({
    lists: await listLists(db, user.id, params.groupId),
  }),
});

export const postList = routeDefinition({
  method: "POST",
  path: "/groups/{groupId}/lists",
  summary: "Create a list. Members only (BR-12).",
  params,
  body: createListRequestSchema,
  response: listSchema,
  successStatus: 201,
  errors: ["FORBIDDEN"],
  handler: async ({ params, body }, { db, clock, user }) =>
    createList(db, clock, user.id, params.groupId, body),
});
