import { z } from "zod";

import { routeDefinition } from "@/server/http/route";
import {
  createdInvitationSchema,
  createInvitationRequestSchema,
  invitationCollectionSchema,
} from "@/server/http/schemas";
import {
  createInvitation,
  listInvitations,
} from "@/server/services/invitations";
import { invitationPath } from "@/shared/invitations";
import { rateLimits } from "@/shared/limits";

// A group's invitations (docs/05-API.md, section 2; FR-06, BR-08, BR-12).

const params = z.object({ groupId: z.uuid() });

export const getInvitations = routeDefinition({
  method: "GET",
  path: "/groups/{groupId}/invitations",
  summary:
    "The group's pending invitations that haven't expired, without their links. Members only (BR-12).",
  params,
  response: invitationCollectionSchema,
  errors: ["FORBIDDEN"],
  handler: async ({ params }, { db, clock, user }) => ({
    invitations: await listInvitations(db, clock, user.id, params.groupId),
  }),
});

export const postInvitation = routeDefinition({
  method: "POST",
  path: "/groups/{groupId}/invitations",
  summary:
    "Create a member or buyer invitation that expires in 7 days, and get its link. Members only (BR-08, BR-12, BR-32).",
  params,
  body: createInvitationRequestSchema,
  response: createdInvitationSchema,
  successStatus: 201,
  rateLimit: rateLimits.createInvitation,
  errors: ["FORBIDDEN"],
  handler: async ({ params, body }, { db, clock, user, appUrl }) => {
    if (!appUrl) throw new Error("APP_URL is not set.");
    const { code, ...invitation } = await createInvitation(
      db,
      clock,
      user.id,
      params.groupId,
      body,
    );
    return { ...invitation, link: new URL(invitationPath(code), appUrl).href };
  },
});
