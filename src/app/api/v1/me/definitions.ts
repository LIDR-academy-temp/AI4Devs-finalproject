import { routeDefinition } from "@/server/http/route";
import { meSchema, updateMeRequestSchema } from "@/server/http/schemas";
import { getCurrentUser, updateProfile } from "@/server/services/me";

// The current user (docs/05-API.md, section 2).

export const getMe = routeDefinition({
  method: "GET",
  path: "/me",
  summary:
    "Current user, memberships, and onboarding state. Also available before onboarding is complete.",
  access: "before-onboarding",
  response: meSchema,
  handler: async (_input, { db, user }) => getCurrentUser(db, user.id),
});

export const patchMe = routeDefinition({
  method: "PATCH",
  path: "/me",
  summary:
    "Change the language, WhatsApp number, or email setting (FR-04). The WhatsApp number can't be removed (BR-04).",
  body: updateMeRequestSchema,
  response: meSchema,
  handler: async ({ body }, { db, clock, user }) =>
    updateProfile(db, clock, user.id, body),
});
