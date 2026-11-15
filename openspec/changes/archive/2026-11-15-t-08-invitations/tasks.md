# Tasks

T-08's acceptance criteria are AC-10 (tasks 4.5 and 8.4), AC-11 (tasks 4.7 and 8.6), AC-12 (tasks 4.7 and 8.6), AC-13 (tasks 4.7 and 8.6), AC-14 (task 4.6), AC-15 (tasks 4.8 and 8.7), AC-16 (task 3.4), AC-100 (tasks 4.5 and 8.3), AC-101 (task 9.4), and AC-102 (task 6.2). The other scenarios are named after the rule they verify or after the ticket, as [Security and testing §2.6](../../../docs/07-SECURITY-AND-TESTING.md#26-coverage-targets) describes. Of the definition of done, all three items in scope apply: lint and type checks with an up-to-date OpenAPI document (group 10), interface text in Spanish and English (task 7.4), and the owning documents (group 1).

## 1. Documents first

- [x] 1.1 Update `docs/01-PRD.md`: BR-06 says that a user who signs up through an invitation and declines it gets their own group and first list; BR-08 adds declining as a way a link stops working; FR-06 says the invitee can accept or decline; the FR-06 row in §19 adds `…/decline`. Update the header. Verify that no rule text is copied into other documents.
- [x] 1.2 Update `docs/04-DATA-MODEL.md`: `declined` in the `invitation_status` enumeration and the entity diagram (§1.2 and §2), and a declined invitation in the seed data (§3). Update the header. Verify that the Mermaid diagrams parse.
- [x] 1.3 Update `docs/05-API.md`: in §1, `INVITATION_INVALID` also covers a declined invitation, and `RULE_VIOLATION` gives `ALREADY_IN_GROUP` as an example reason (BR-09); in §2, `POST /me/onboarding` takes an optional `invitationCode` that skips getting started for a usable invitation, the preview also says whether a signed-in user already has the access, and a new row is added for `POST /invitations/by-code/{code}/decline`. Update the header.
- [x] 1.4 Update `docs/02-UX-DESIGN.md`: flow C names the `/invitations/{code}` address, the return to the invitation after One last step, and what Decline does; §2.10 adds the English and Spanish for the Invitation screen (who invites, the group, the type, Accept, Decline, back to the start), "Invite the person who will buy", and "Link copied". Update the header.
- [x] 1.5 Update `docs/08-WORK-TICKETS.md`: T-08's scope adds the decline endpoint, the declined status in the migration, and the invitation code on onboarding. Update the header. Verify that no scope item is in two tickets.
- [x] 1.6 Update `design/screens.md`: the Invitation row gets its route `/invitations/[code]`, its components, and the tickets "T-08 → T-23"; the Group row gets its components and "T-08 → T-28"; the Success toast row gets `src/components/ui/toast.tsx` and T-08; the "Not matched" note no longer lists the Invitation route. Statuses stay Placeholder. Update the header and the Tickets column description if it names only D2 tickets.
- [x] 1.7 Run `npm run check:links`, and check that every changed ID and anchor resolves.
- [x] 1.8 Bring issue #34 in line with the ticket: title "T-08 Invitations", and a description in the format `scripts/setup-github-issues.py` writes, with dependencies T-07, T-05, and T-20 and acceptance criteria AC-10 to AC-16 and AC-100 to AC-102. Verify with `gh issue view 34`.

## 2. Schema and seed data

- [x] 2.1 Add `declined` to `invitationStatus` and the nullable `inviteeName` (`invitee_name`, `varchar(100)`) to `invitations` in `src/server/db/schema.ts`; generate the migration with drizzle-kit in `src/server/db/migrations/`. Verify that `npm run db:migrate` applies it to an empty database and to one at the previous migration.
- [x] 2.2 Add `inviteeName: { max: 100 }` to `fieldLimits` in `src/shared/limits.ts`, and an optional invitee name field to `src/shared/fields.ts` that trims, treats blank as none, and refuses over 100 characters. Verify with a case in `tests/unit/field-limits.test.ts`.
- [x] 2.3 In `scripts/seed-data.ts`, give the pending invitation the invitee name "Carlos" and add a declined invitation (`seedIds.invitations.declined`). Update `tests/integration/seed-data.test.ts` for the modified "Invitations cover every state" scenario. Verify that it passes and that loading the seed twice still adds nothing.
- [x] 2.4 Extend `tests/integration/database-schema.test.ts` so the text-limit and enumeration scenarios cover `invitations.invitee_name` (101 characters refused) and `declined` (accepted). Verify that it passes.

## 3. Creating, listing, and cancelling invitations

- [x] 3.1 Add `src/server/services/invitations.ts` with the usable-invitation check, code generation, `createInvitation`, `listInvitations`, and `cancelInvitation` (design decisions 1 and 5), writing `invitations`. Add an invitation factory to `tests/support/factories.ts`. Verify with `npx tsc --noEmit`.
- [x] 3.2 Add the request and response schemas (`CreateInvitationRequest`, `Invitation`, `CreatedInvitation`) to `src/shared/requests.ts` and `src/server/http/schemas.ts`, and the routes `GET` and `POST /groups/{groupId}/invitations` (with `rateLimits.createInvitation`) and `DELETE /invitations/{invitationId}` in `src/app/api/v1/`, building the link from `appUrl`. Verify with `npx tsc --noEmit` and `npm run build`.
- [x] 3.3 In `tests/integration/invitations-endpoints.test.ts`, test "FR-06 a member creates a buyer invitation with a name", "FR-06 the invitee name is optional", "BR-32 an invitee name over 100 characters is refused", "BR-13 a user outside the group can't create an invitation", "T-08 each invitation has its own unguessable code", and "T-08 creating invitations is limited to 30 a day", with a controlled clock. Verify that they pass and each 2xx response matches its schema.
- [x] 3.4 Write the integration test `AC-16 a buyer can't create an invitation`, for both types, checking 403 and that no invitation was created. Verify that it passes.
- [x] 3.5 Test "FR-06 only pending invitations that haven't expired are listed", "BR-12 a buyer can't list the invitations", "FR-06 a member cancels a pending invitation", "BR-12 a buyer can't cancel an invitation", "BR-13 an invitation of another group is not available", and "BR-08 an invitation that is no longer pending can't be cancelled". Verify that they pass.

## 4. Preview, accept, and decline

- [x] 4.1 Add `previewInvitation`, `acceptInvitation`, and `declineInvitation` to `src/server/services/invitations.ts`, locking the invitation row, checking access, upserting `memberships`, and running `startWithoutInvitationIn` on decline (design decisions 2 and 4). Verify with `npx tsc --noEmit`.
- [x] 4.2 Add the `InvitationPreview` and `AcceptedInvitation` schemas, and the routes `GET /invitations/by-code/{code}` (`access: "public"`), `POST …/accept`, and `POST …/decline` in `src/app/api/v1/invitations/by-code/[code]/`. Verify with `npx tsc --noEmit` and `npm run build`.
- [x] 4.3 Test "FR-06 a signed-out person sees who invites them, to which group, and as what", "BR-05 an invitation from a deleted account names "Former user"", and "BR-13 an unknown code is not available". Verify that they pass and the preview contains no emails or numbers.
- [x] 4.4 Test "BR-08 two people accept the same link at the same time" on two connections, and "BR-11 a person whose access ended joins again". Verify that they pass, and that the concurrency test fails without the row lock.
- [x] 4.5 Write the integration tests `AC-10 a new user with a buyer invitation joins as a buyer` and `AC-100 a new user with a member invitation joins as a member`, each completing onboarding with the code, then accepting, and checking the single membership and that no group was created. Verify that they pass.
- [x] 4.6 Write the integration test `AC-14 a buyer who accepts a member invitation becomes a member`, checking one membership of type member and the invitation accepted. Verify that it passes.
- [x] 4.7 Write the integration tests `AC-11 an invitation older than 7 days asks for a new one` (controlled clock), `AC-12 an accepted invitation asks for a new one`, and `AC-13 a cancelled invitation asks for a new one`, each checking 410 for the preview and accept; and test "BR-08 a declined invitation asks for a new one". Verify that they pass.
- [x] 4.8 Write the integration test `AC-15 a member opens an invitation to their own group`, for both types, checking the preview, the 409 with `ALREADY_IN_GROUP`, and that both invitations still work for another user; and test "BR-09 a buyer opens a buyer invitation to their own group". Verify that they pass.
- [x] 4.9 Test "BR-06 a new user who declines gets their own group" and "BR-08 a user with a group declines". Verify that they pass.

## 5. Onboarding through an invitation

- [x] 5.1 Add the optional `invitationCode` to `onboardingRequestShape` in `src/shared/requests.ts`, ignored when malformed, and skip `startWithoutInvitationIn` in `completeOnboarding` (`src/server/services/me.ts`) when it names a usable invitation (design decision 3). Pass it from `POST /me/onboarding`. Verify with `npx tsc --noEmit`.
- [x] 5.2 In `tests/integration/onboarding-endpoint.test.ts`, test "BR-06 completing onboarding with an invitation creates no group" and "BR-06 an invitation that no longer works doesn't stop getting started" (expired, cancelled, accepted, declined, unknown, and malformed codes). Verify that they pass, and that the existing onboarding tests still pass.

## 6. Contact details in the group

- [x] 6.1 Add `email` to members and `whatsappNumber` to buyers in `getGroup` (`src/server/services/groups.ts`), null for deleted accounts, with a `GroupBuyer` schema in `src/server/http/schemas.ts` (design decision 6). Verify with `npx tsc --noEmit`.
- [x] 6.2 Write the integration test `AC-102 a buyer's request for the group has no contact details`, checking the 403 body for each seed member's email and each seed buyer's number. Verify that it passes.
- [x] 6.3 In `tests/integration/groups-endpoints.test.ts`, test "FR-07 a member sees members' emails and buyers' WhatsApp numbers" and "BR-05 a deleted account shows no contact details". Verify that they pass, and that the existing group tests pass with the new fields.

## 7. Shared interface pieces

- [x] 7.1 Add `src/components/ui/toast.tsx` on the `radix-ui` Toast primitive, styled to DESIGN.md, Toast, with a `ToastProvider`, one viewport placed above the bottom bar below 768px, and a `useToast()` hook; mount the provider in `src/components/app-shell/app-shell.tsx` (design decision 9). Verify with `npx tsc --noEmit` and `npm run lint`.
- [x] 7.2 Move the current-group cookie writer from `src/components/app-shell/group-selector.tsx` to `src/components/current-group.ts`, and use it from the selector. Verify that the existing app-shell browser tests pass.
- [x] 7.3 Add a `returnTo` prop to `WelcomeActions` (`src/app/(public)/welcome-actions.tsx`), used for Google's `callbackURL` and `errorCallbackURL`, defaulting to Welcome's current behavior. Verify that the existing Welcome browser tests pass.
- [x] 7.4 Add the `invitation` and `group` namespaces to `src/i18n/en.json` and `src/i18n/es.json`, with the Spanish from UX §2.10 and the invitation message as an ICU message with the name and the type (UX §2.6). Verify that `tests/unit/translations.test.ts` passes.
- [x] 7.5 Add `daysUntil` to `src/shared/` with unit tests for 7 days just after creation, 1 day, under 12 hours (today), and past expiry (0). Verify that they pass.

## 8. Invitation screen

- [x] 8.1 Add `src/app/(public)/invitations/[code]/page.tsx` with the five states in design decision 7, built to DESIGN.md and `design/stitch/03-invitation`, and an `InvitationActions` client component for Accept and Decline, with the pending state and the inline "Couldn't save" error. Verify with `npm run build`.
- [x] 8.2 Pass the invitation code through One last step: `src/app/(public)/onboarding/page.tsx` reads and checks it, and `onboarding-form.tsx` sends it and returns to the invitation. Test "T-08 a new user signs in from an invitation and returns to it" and "T-08 a new user from an invitation goes back to it" in `tests/e2e/invitations.spec.ts`. Verify that they pass.
- [x] 8.3 Write the browser test `AC-100 a new user accepts a member invitation and lands on Lists`, in Spanish and English, with a new member creating the invitation through the API. Verify that it passes in Chromium.
- [x] 8.4 Write the browser test `AC-10 a new user accepts a buyer invitation and lands on To buy`. Verify that it passes.
- [x] 8.5 Test "FR-06 a signed-out person opens a buyer invitation", "BR-06 a new user declines and lands on their own group", and "T-08 a failed accept keeps the invitation on screen". Verify that they pass.
- [x] 8.6 Write the browser tests `AC-11 an expired link on the screen`, `AC-12 an accepted link on the screen`, and `AC-13 a cancelled link on the screen`, using the seed invitations. Verify that they pass.
- [x] 8.7 Write the browser test `AC-15 a member opens an invitation to their own group`, with a seed member and the seed's pending invitation, checking that it stays pending. Verify that it passes.
- [x] 8.8 Test "T-08 the Invitation screen has no accessibility violations" with Axe in both languages, in each state. Verify that it reports no violations.

## 9. Group screen

- [x] 9.1 Replace the placeholder in `src/app/(app)/group/page.tsx` with the Group screen, and add `src/app/(app)/group/loading.tsx` and the components in `src/components/group/` (design decision 8), built to DESIGN.md and `design/stitch/08-group`, reading the current group through `getGroup` and `listInvitations`. Cover loading (skeletons), empty (no buyers, no pending invitations), and error (the shell's error state). Verify with `npm run build`.
- [x] 9.2 Add the invite sheet: the name field with `CharacterCount`, Create link calling `POST /groups/{groupId}/invitations`, then the link, Share on WhatsApp (`wa.me` with the invitation message), Copy link with its "Link copied" confirmation, and the expiry; the inline "Couldn't save" error keeps the name. Verify with `npm run build`.
- [x] 9.3 In `tests/e2e/group.spec.ts`, test "FR-07 a member sees the group's members and buyers", "T-08 a group with no buyers invites one", "FR-06 a member creates a buyer invitation and shares it on WhatsApp", "FR-06 an invitation without a name starts its message without one", "FR-06 a member copies the link", "BR-32 the invitee name stops at its limit", and "T-08 a failed invitation keeps what the member typed". Verify that they pass.
- [x] 9.4 Write the browser test `AC-101 the pending invitation for Carlos`, in Spanish and English, with a new member creating the invitation. Verify that it passes.
- [x] 9.5 Add Cancel invitation calling `DELETE /invitations/{invitationId}` with the "Invitation cancelled" toast, and the inline error when it fails. Test "FR-06 a member cancels an invitation" and "T-08 the toast closes by itself or with Close". Verify that they pass.
- [x] 9.6 Test "BR-13 a user who is only a buyer opens Group" in `tests/e2e/app-shell.spec.ts`, and remove any Group placeholder expectation there. Verify that the app-shell tests pass.
- [x] 9.7 Test "T-08 Group has no accessibility violations" with Axe in both languages, with the sheet open, a link created, and the toast shown. Verify that it reports no violations.

## 10. OpenAPI document and checks

- [x] 10.1 Register the new schemas and paths, and run `npm run openapi:generate` to update `docs/openapi.yaml`. Verify that `tests/integration/openapi-document.test.ts` passes and the document validates.
- [x] 10.2 Run `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run test:coverage` (domain services at 80% or more), and `npm run test:e2e`. Verify that all pass.
- [x] 10.3 Check that no component contains a hard-coded string, and that every AC listed above has a test whose name starts with its ID (`grep -rn "AC-1[0-6]\|AC-10[0-2]" tests`). Verify by listing each AC with its test.

## Workflow follow-up

- Commit the approved proposal on its own, then run `/opsx:apply`.
- When the pull request is ready to merge: `/opsx:archive`, then record the session (CLAUDE.md, AI usage record).
