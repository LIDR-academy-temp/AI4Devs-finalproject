import { z } from "zod";

import { routeDefinition } from "@/server/http/route";
import { cancelInvitation } from "@/server/services/invitations";

// Cancelling an invitation (docs/05-API.md, section 2; BR-08, BR-12).

export const deleteInvitation = routeDefinition({
  method: "DELETE",
  path: "/invitations/{invitationId}",
  summary:
    "Cancel a pending invitation, so its link stops working. Members of its group only (BR-08, BR-12).",
  params: z.object({ invitationId: z.uuid() }),
  errors: ["FORBIDDEN", "INVITATION_INVALID"],
  handler: async ({ params }, { db, clock, user }) =>
    cancelInvitation(db, clock, user.id, params.invitationId),
});
