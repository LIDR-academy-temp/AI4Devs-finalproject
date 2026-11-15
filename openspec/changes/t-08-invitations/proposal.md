# T-08 Invitations

**Issue:** [#34](https://github.com/ojordan0/AI4Devs-finalproject/issues/34) · **Ticket:** [docs/08-WORK-TICKETS.md, T-08](../../../docs/08-WORK-TICKETS.md#t-08-invitations) · **Branch:** `feat/t-08-invitations`

**Covers:** Epic E-02. Stories: US-04 (main). Functional requirements: FR-05 (joining through an invitation), FR-06, FR-07 (viewing the group's people with their contact details), FR-17. Business rules: BR-06, BR-08, BR-09, BR-12, BR-13, BR-32. Acceptance criteria: AC-10, AC-11, AC-12, AC-13, AC-14, AC-15, AC-16, AC-100, AC-101, AC-102.

## Why

The only way into a group is an invitation (FR-17). Without one, a group has no buyers and the core cycle can't start. T-08 lets any member invite a member or a buyer with a link shared on WhatsApp, and lets the invitee join with Google. It also builds the Group screen, which until now has been a placeholder. D3 is due on December 9, 2026, and T-15 (delivery addresses) and the design tickets T-23 and T-28 depend on it.

## What Changes

- **Invitations API (FR-06, BR-08, BR-12, BR-32):** `GET` and `POST /groups/{groupId}/invitations` list a group's pending invitations and create a new one, with an optional `inviteeName`. `DELETE /invitations/{invitationId}` cancels one. All three are for members only; a buyer gets `403 FORBIDDEN` (AC-16). Creating an invitation is limited to 30 a day per user (Security and testing §1), and the response includes the invitation's link.
- **Preview, accept, and decline (BR-06, BR-08, BR-09):** `GET /invitations/by-code/{code}` returns the inviter, the group, the type, and, for a signed-in user, whether they already have the access the invitation gives. No sign-in is needed. `POST …/accept` adds the user to the group with the invitation's type, turns a buyer into a member (AC-14), and uses up the link. `POST …/decline` (new) sets the invitation to the new `declined` status. A user who has never had a membership and declines gets their own group and first list. A link that was used, declined, cancelled, or has expired answers `410 INVITATION_INVALID` (AC-11 to AC-13). A user who already has the access the invitation gives is told so, and the invitation stays valid (AC-15).
- **Onboarding through an invitation (BR-06, AC-10, AC-100):** `POST /me/onboarding` takes an optional `invitationCode`. When the code names a pending invitation that hasn't expired, getting started is skipped. Otherwise getting started runs as before. One last step then sends the user back to the Invitation screen to accept.
- **Contact details in `GET /groups/{groupId}` (FR-07, BR-12):** each member's email and each buyer's WhatsApp number. A buyer of the group still gets `403 FORBIDDEN`, and that response contains no emails and no numbers (AC-102).
- **Schema:** a migration adds `invitations.invitee_name` (up to 100 characters, optional) and the `declined` value to `invitation_status`. The seed data gives Carlos's pending invitation its name and adds a declined invitation.
- **Invitation screen** at `/invitations/[code]`, in `src/app/(public)`, built to DESIGN.md and `design/stitch/03-invitation`. It shows who is inviting, to which group, and as what. A signed-out person sees **Continue with Google**, which signs them in and brings them back to the screen. A new user is then sent to One last step and back again. A signed-in user sees **Accept** and **Decline**. The screen has its own messages for a link that is no longer valid and for a user who is already in the group (UX design §1, flow C).
- **Group screen** at `/group`, replacing the T-05 placeholder, built to DESIGN.md and `design/stitch/08-group`. It shows the group's name and owner, **Invite a member** and **Invite a buyer** (a sheet with the optional name, **Create link**, the new link, **Share on WhatsApp**, **Copy link**, and when the link expires), the pending invitations with **Cancel invitation**, the members with their emails and the Owner tag, and the buyers with their WhatsApp numbers (UX design §2.4).
- **Toast** in `src/components/ui/toast.tsx`, on the Toast primitive in `radix-ui` ([DESIGN.md, Toast](../../../DESIGN.md#toast)). T-08 uses it for "Invitation cancelled".
- **Invitation message** for **Share on WhatsApp**, in the inviting member's language, from the translation files (UX design §2.6).
- **Documents updated first**, because reviewing this ticket found gaps. The project owner decided each one:
  - **Declining an invitation.** UX design §2.3 shows a Decline button, but no document says what it does. Declining sets the invitation to a new `declined` status, which makes the link stop working, like a used one. A user who has never had a membership and declines gets their own group and first list. BR-06 and BR-08 in the PRD, FR-06 and its row in §19, the enumeration in Data model §2, the seed data in Data model §3, API §1 and §2, and flow C in UX design §1 are updated.
  - **How onboarding learns about the invitation.** BR-06 says a person who signs up through an invitation gets no group of their own, but `POST /me/onboarding` receives no invitation. It gets an optional `invitationCode` (API §2, and the T-08 scope).
  - **The Invitation screen's address.** No document names it, and design/screens.md notes that. It is `/invitations/[code]`, in `design/screens.md` and UX design flow C.
  - **What the preview tells a signed-in user, and what accept and decline answer to someone already in the group.** API §2 doesn't say. The preview reports whether the user already has the access the invitation gives (BR-09). Accept and decline refuse such a user with `409 RULE_VIOLATION`, reason `ALREADY_IN_GROUP`, and leave the invitation pending (API §1 and §2).
  - **Text for the Invitation screen.** UX design §2.10 has no English or Spanish for the screen's labels, Accept and Decline among them, or for the confirmation after **Copy link**. Rows are added.

## Capabilities

### New Capabilities

- `invitations`: creating, listing, cancelling, previewing, accepting, and declining invitations, with the single-use link, its expiry, and who may do each.
- `invitation-screen`: the screen an invitee opens from the link, through sign-in and onboarding, to accept or decline.
- `group-screen`: the Group screen for members, with inviting, pending invitations, members, and buyers, and the success toast.

### Modified Capabilities

- `groups`: `GET /groups/{groupId}` adds each member's email and each buyer's WhatsApp number. A buyer's `403` contains neither (AC-102).
- `onboarding`: `POST /me/onboarding` takes an optional invitation code that skips getting started. A user who came from an invitation goes back to it after One last step.
- `seed-data`: the pending invitation has an invitee name, and a declined invitation is added.
- `app-shell`: Group is no longer a placeholder.

## Non-goals

| Left out | Owner |
| --- | --- |
| Delivery addresses on the Group screen, and the "Add where things should be sent" empty state | T-15 |
| Renaming the group, removing members and buyers, transferring ownership, and leaving | Milestone 2 (increments 6 and 9) |
| **Create a group** for a user with no group | Milestone 2 (FR-05) |
| "Notify buyer" and its picker on Lists | Milestone 2 (FR-35) |
| Checking the Group and Invitation screens against their Stitch screens after they are built | T-28 and T-23 |
| Showing an invitation's link again after its sheet closes. The pending list has no link (API §2), so a member cancels and creates a new invitation. | Not planned |
| Recording who declined an invitation | Not planned; the status is enough for BR-08 |

## Impact

- **Tables (existing):** `invitations` gets the new `invitee_name` column; `invitation_status` gets the `declined` value. Through one new migration in `src/server/db/migrations/`. `memberships` is written on accept (a new row, a buyer's type changed to member, or an ended membership made active again); `groups` and `lists` are written by getting started on decline; `users` is read.
- **Endpoints (new):** `GET` and `POST /api/v1/groups/{groupId}/invitations`, `DELETE /api/v1/invitations/{invitationId}`, `GET /api/v1/invitations/by-code/{code}`, `POST /api/v1/invitations/by-code/{code}/accept`, `POST /api/v1/invitations/by-code/{code}/decline`.
- **Endpoints (existing):** `GET /api/v1/groups/{groupId}` (contact details), `POST /api/v1/me/onboarding` (optional `invitationCode`).
- **Services:** `src/server/services/invitations.ts` (new); `src/server/services/groups.ts` and `src/server/services/me.ts` (existing).
- **Shared code (existing):** `src/shared/limits.ts` (invitee name limit), `src/shared/requests.ts` and `src/server/http/schemas.ts` (request and response schemas), `src/server/services/errors.ts` (reused as is).
- **Pages:** `src/app/(public)/invitations/[code]/page.tsx` (new); `src/app/(app)/group/page.tsx` (existing, the placeholder is replaced) and `src/app/(app)/group/loading.tsx` (new); `src/app/(public)/onboarding/` (existing, carries the invitation code).
- **Components:** `src/components/ui/toast.tsx` (new); `src/components/group/` for the Group screen and its invite sheet (new); `src/components/current-group.ts` (new, the current-group cookie writer moved out of `src/components/app-shell/group-selector.tsx`); `src/components/app-shell/app-shell.tsx` (existing, mounts the toast provider); `src/app/(public)/welcome-actions.tsx` (existing, gets a return address so the Invitation screen can reuse it). Existing `src/components/ui` components (Button, Dialog, Input, Label, Skeleton) and `src/components/lists/character-count.tsx` are reused.
- **Translations (existing files):** `src/i18n/en.json` and `src/i18n/es.json`.
- **Seed data (existing):** `scripts/seed-data.ts`.
- **Generated file (existing):** `docs/openapi.yaml`.
- **Changed documents:** `docs/01-PRD.md` (BR-06, BR-08, FR-06, §19), `docs/02-UX-DESIGN.md` (flow C, §2.10), `docs/04-DATA-MODEL.md` (§2 enumerations, §3 seed), `docs/05-API.md` (§1, §2), `docs/08-WORK-TICKETS.md` (T-08 scope), `design/screens.md` (Invitation, Group, and Success toast rows; Not matched).
- **GitHub:** issue #34 is still titled "T-08 Buyer invitations" and lists old acceptance criteria and dependencies. Its title and description are brought in line with the ticket.
