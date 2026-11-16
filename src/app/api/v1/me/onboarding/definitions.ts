import { routeDefinition } from "@/server/http/route";
import { meSchema, onboardingRequestSchema } from "@/server/http/schemas";
import { completeOnboarding } from "@/server/services/me";

// Completing onboarding (docs/05-API.md, section 2): available before
// onboarding is complete, like GET /me.

export const postOnboarding = routeDefinition({
  method: "POST",
  path: "/me/onboarding",
  summary:
    "Save the language, WhatsApp number, and age and terms acceptance, and create the user's group and first list unless they sign up through a usable invitation (FR-02, BR-01, BR-04, BR-06). Returns the current user; if onboarding is already complete, changes nothing.",
  access: "before-onboarding",
  body: onboardingRequestSchema,
  response: meSchema,
  handler: async ({ body }, { db, clock, user }) =>
    completeOnboarding(db, clock, user.id, {
      language: body.language,
      whatsappNumber: body.whatsappNumber,
      invitationCode: body.invitationCode,
    }),
});
