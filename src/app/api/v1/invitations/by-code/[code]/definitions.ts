import { z } from "zod";

import { routeDefinition } from "@/server/http/route";
import {
  acceptedInvitationSchema,
  invitationPreviewSchema,
} from "@/server/http/schemas";
import {
  acceptInvitation,
  declineInvitation,
  previewInvitation,
} from "@/server/services/invitations";
import { invitationCode } from "@/shared/invitations";

// The invitation behind a link (docs/05-API.md, section 2; FR-06, BR-06,
// BR-08, BR-09). A code of the wrong shape answers like an unknown one.

const params = z.object({ code: invitationCode });

export const getInvitationByCode = routeDefinition({
  method: "GET",
  path: "/invitations/by-code/{code}",
  summary:
    "Invitation preview: inviter, group, and type, and, for a signed-in user, whether they already have the access it gives. No sign-in required (BR-08, BR-09).",
  access: "public",
  params,
  response: invitationPreviewSchema,
  errors: ["INVITATION_INVALID"],
  handler: async ({ params }, { db, clock, user, language }) =>
    previewInvitation(db, clock, params.code, user?.id ?? null, language),
});

export const postAcceptInvitation = routeDefinition({
  method: "POST",
  path: "/invitations/by-code/{code}/accept",
  summary:
    "Accept an invitation: join its group with its type (BR-08, BR-09). Refused with ALREADY_IN_GROUP if the user already has that access.",
  params,
  response: acceptedInvitationSchema,
  errors: ["INVITATION_INVALID", "RULE_VIOLATION"],
  handler: async ({ params }, { db, clock, user }) =>
    acceptInvitation(db, clock, user.id, params.code),
});

export const postDeclineInvitation = routeDefinition({
  method: "POST",
  path: "/invitations/by-code/{code}/decline",
  summary:
    "Decline an invitation, which uses up its link; a user who has never had a membership then gets their own group and first list (BR-06, BR-08). Refused with ALREADY_IN_GROUP like accept.",
  params,
  errors: ["INVITATION_INVALID", "RULE_VIOLATION"],
  handler: async ({ params }, { db, clock, user, language }) =>
    declineInvitation(db, clock, user.id, params.code, language),
});
