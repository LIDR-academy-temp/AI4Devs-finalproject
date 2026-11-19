# Design

## Context

- The `invitations` table, `invitation_status` enumeration, and `InvitationInvalidError` exist (T-02, T-03), with no service or endpoint. The seed has four invitations in the García Group, without invitee names.
- `getGroup` in `src/server/services/groups.ts` returns members (`id`, `name`, `isOwner`) and buyers (`id`, `name`), and refuses buyers with `ForbiddenError` (T-07). `completeOnboarding` in `src/server/services/me.ts` always calls `startWithoutInvitationIn`, which locks the user's row and does nothing for a user who has or had a membership.
- The route wrapper (`src/server/http/route.ts`) already supports `access: "public"`, a per-action `rateLimit`, and has `appUrl` in its dependencies. `rateLimits.createInvitation` (30 a day) is defined in `src/shared/limits.ts`.
- `/group` renders the T-05 placeholder. The shell's `loadShell` picks the current group from the `CURRENT_GROUP_COOKIE` cookie, which `group-selector.tsx` writes.
- `Dialog` in `src/components/ui/dialog.tsx` has a `sheet` variant that follows DESIGN.md, Sheets. `CharacterCount` is in `src/components/lists/character-count.tsx`. `WelcomeActions` signs in with Google with `callbackURL: "/"`; the development sign-in refreshes the page.
- Browser tests sign in seed users only to look; scenarios that change data sign up new users (`tests/e2e/support.ts`).
- See proposal.md for why, and the specs for the required behavior.

## Goals / Non-Goals

**Goals:**

- One service, `src/server/services/invitations.ts`, owns every invitation rule. Pages and route handlers only call it.
- The single-use link holds under concurrency without a new locking scheme.
- New users who sign up through an invitation never get a group of their own, and never end up with two.

**Non-Goals:**

- No new package: the Toast primitive comes from `radix-ui`, which is installed.
- No email or WhatsApp message is sent by the server; sharing happens in the member's WhatsApp.
- No change to how the shell picks the current group, beyond writing the cookie after accepting.

## Decisions

### 1. Codes, links, and expiry

The service generates the code with `crypto.randomBytes(32).toString("base64url")`: 256 random bits, 43 URL-safe characters, as Data model §2 defines. `expires_at` is the clock's time plus 7 days. An invitation counts as usable when its status is `pending` and `expires_at` is after the clock's time. One helper, used for listing, cancelling, the preview, accept, decline, and onboarding, applies that check, so there is a single definition of "expired".

The service returns the code, and the route handler builds the link as `${appUrl}/invitations/${code}`, so the service knows nothing about URLs. The list endpoint never returns the code.

*Alternative:* storing only a hash of the code. Rejected because Data model §2 stores the code itself, and a stolen database already exposes the groups.

### 2. Accept and decline lock the invitation row

Both run in one transaction that starts with `SELECT … FROM invitations WHERE code = $1 FOR UPDATE`. Then:

1. No row → `NotAvailableError` (404). Not usable → `InvitationInvalidError` (410).
2. The user's membership in the group is read. An active member, or an active buyer holding a buyer invitation, gets `RuleViolationError("ALREADY_IN_GROUP")` (409), and nothing changes (BR-09).
3. **Accept:** the membership is upserted on `(group_id, user_id)`: a new row with the invitation's type; a buyer's row set to `member` (keeping `joined_at`); or an ended row set active again with the invitation's type, a new `joined_at`, and no `ended_at`. The invitation is set to `accepted` with `accepted_by` and `accepted_at`.
4. **Decline:** the invitation is set to `declined`, then `startWithoutInvitationIn(tx, …)` runs, which gives a group only to a user who has never had a membership (BR-06).

The row lock makes a second, concurrent accept wait, then see `accepted` and get 410 (BR-08). The lock order is the invitation row first, then the user's row (in decline). Onboarding locks the user's row and only reads the invitation without a lock, so the two can't deadlock.

*Alternative:* a conditional `UPDATE … WHERE status = 'pending'` without a lock. Rejected because the access check in step 2 has to happen between reading the invitation and using it up.

### 3. Onboarding takes an optional invitation code

`onboardingRequestShape` gains an optional `invitationCode`. Its shape is checked (43 URL-safe characters), and a malformed code is ignored rather than refused, so a bad link never blocks onboarding. Inside `completeOnboarding`'s transaction, when the code names a usable invitation, `startWithoutInvitationIn` is skipped. The invitation is not used up there: the user still accepts or declines it on the Invitation screen, as flow C describes.

*Alternative:* accepting in the same call. The project owner chose the separate Accept, matching flow C and AC-10's wording.

### 4. The preview service takes an optional user

`previewInvitation(db, clock, code, userId | null, language)` returns `{ inviterName, groupName, type, alreadyInGroup }`. `alreadyInGroup` is `false` for a signed-out request. The inviter's name goes through `personName`, so a deleted account is "Former user". The endpoint is `access: "public"` and reads the session if there is one. The Invitation page calls the same service directly.

### 5. Errors the API answers

| Case | Error |
| --- | --- |
| Unknown code, or an invitation ID outside the user's groups | 404 `NOT_AVAILABLE` |
| Buyer creating, listing, or cancelling | 403 `FORBIDDEN` (`requireMemberAccess`) |
| Used, declined, cancelled, or expired | 410 `INVITATION_INVALID` |
| Already has the access (accept, decline) | 409 `RULE_VIOLATION`, reason `ALREADY_IN_GROUP` |
| Invitee name over 100 characters | 422 `VALIDATION_FAILED` |
| Over 30 invitations a day | 429 `RATE_LIMITED` |

For cancel, the service finds the invitation's group by its ID, then calls `requireMemberAccess`, so an invitation in another group looks the same as a missing one.

### 6. Group contact details

`getGroup` adds `email` to members and `whatsappNumber` to buyers, both `null` for a deleted account (BR-05). The response schema gets a `GroupBuyer` schema instead of reusing `PersonRef`, so other endpoints that name people are unchanged. The buyer's `ForbiddenError` already carries no data, which is what AC-102 checks.

### 7. Invitation screen and the sign-in round trip

`src/app/(public)/invitations/[code]/page.tsx` is a server page that calls `previewInvitation` and picks one state:

1. Not available or no longer valid → the "no longer valid" message, with a link to `/`. Checked first, so a signed-in user who hasn't finished onboarding isn't sent to One last step for a dead link.
2. Signed out → the invitation, and `WelcomeActions` with a new `returnTo` prop (`/invitations/{code}`) used as Google's `callbackURL`, and `errorCallbackURL` with `?error=sign-in`. The development sign-in already refreshes the page.
3. Signed in, not onboarded → `redirect("/onboarding?invitation={code}")`.
4. `alreadyInGroup` → "You're already in this group." with a link to `/`.
5. Otherwise → the invitation with an `InvitationActions` client component: **Accept** and **Decline**.

After accepting, a member's client writes `CURRENT_GROUP_COOKIE` with the joined group, then goes to `/lists`; a buyer goes to `/to-buy`. After declining, the client goes to `/`, which already sends an onboarded user to their main screen. The cookie writer moves out of `group-selector.tsx` into `src/components/current-group.ts`, so both use one.

The onboarding page reads `invitation` from its search parameters, checks its shape, and passes it to `OnboardingForm`. The form sends it as `invitationCode`, and on success goes to `/invitations/{code}` instead of `/lists`. The return address is always built from a code that passed the shape check, never taken from the query string as a URL, so it can't be used to send people to another site.

### 8. Group screen

`src/app/(app)/group/page.tsx` calls `requireTab("group")`, then `getGroup` and `listInvitations` for the current group, and renders components in `src/components/group/`:

- `group-header.tsx`: the name and the "Managed by {name}" subtitle, from the member marked as owner.
- `invite-sheet.tsx`: a client component on `Dialog` with `variant="sheet"`. It has the name field with `CharacterCount`, then **Create link**; after creating, the link in a read-only field, **Share on WhatsApp**, **Copy link**, and the expiry. Closing it refreshes the page.
- `pending-invitations.tsx`: a client component for the rows and **Cancel invitation**, which refreshes the page and shows the toast.
- `people-section.tsx`: members and buyers, with the "Invite the person who will buy" empty state.
- `src/app/(app)/group/loading.tsx`: skeletons for the sections.

**Share on WhatsApp** is a link to `https://wa.me/?text={message}`, opening in a new tab. The message comes from a translation-file ICU message with a `select` on whether there is a name and on the type. Because the screen is in the user's own language, it is in the inviting member's language (UX §2.6).

**Expiry text.** A shared function `daysUntil(expiresAt, now)` returns whole days, rounded to the nearest day and never below 0. 0 shows "Expires today", 1 "Expires in 1 day", and more "Expires in {count} days" (UX §2.10). Rounding makes a new invitation read "7 days". The page passes the server's time to the client components, so the server and the browser render the same text.

**Copy link** uses `navigator.clipboard.writeText`. While the link is on the clipboard, the button's label briefly reads "Link copied", announced politely. This is the only feedback, since creating an invitation has no toast (UX §2.7). The text is added to UX §2.10 with the other new strings.

### 9. Toast

`src/components/ui/toast.tsx` wraps the `radix-ui` Toast primitive with DESIGN.md, Toast, styling. A `ToastProvider` with a single viewport is mounted once in the app shell, `src/components/app-shell/app-shell.tsx`, and a `useToast()` hook shows one toast at a time, replacing the last. Radix gives the polite live region, the pause on hover and focus, and swipe to close. The duration is 5 seconds. Below 768px the viewport sits 16px above the bottom bar, using the bottom bar's height variable from `globals.css`. T-15 reuses it for addresses.

### 10. Translations

New namespaces `invitation` (the screen) and `group` (the Group screen, the invite sheet, the invitation message, and the toast text), in `src/i18n/en.json` and `src/i18n/es.json`. The Spanish comes from UX §2.10, after the rows are added there (task 1). The existing translation test checks that both files have the same keys.

### 11. Tests

- **Integration:** `tests/integration/invitations-endpoints.test.ts` for every invitations scenario, with a controlled clock; additions to `groups-endpoints.test.ts` and `onboarding-endpoint.test.ts`; the concurrent-accept test runs two accepts on two connections, as T-07's concurrent getting-started test does. `tests/support/factories.ts` gets an invitation factory.
- **Unit:** `daysUntil` and the shape check for codes.
- **Browser:** `tests/e2e/invitations.spec.ts` (flow C and the Invitation screen states) and `tests/e2e/group.spec.ts`. Each scenario that uses up an invitation signs up a new member, who creates the invitation through the API, and a second new user in a separate browser context, who opens it. This leaves the seed users unchanged and keeps each scenario under the 30-a-day limit. Scenarios that only look at an invitation (AC-11, AC-12, AC-13, AC-15) open the seed invitations.

## Open points in the documents

Each was decided by the project owner before this change, and task group 1 writes it into the owning document:

- **Decline:** the new `declined` status, and getting started for a user with no membership who declines (BR-06, BR-08).
- **Onboarding through an invitation:** the optional `invitationCode` (API §2).
- **Invitation screen address:** `/invitations/{code}` (UX flow C, design/screens.md).

These smaller ones are decided here, and are also written into the documents:

- **Preview and already-in-group responses:** `alreadyInGroup` in the preview, and `409 RULE_VIOLATION` with `ALREADY_IN_GROUP` for accept and decline (API §1 and §2).
- **Unknown codes:** `404 NOT_AVAILABLE` from the API, and the same "no longer valid" message on the screen as a used link, because a cut-off or mistyped link should also tell the person to ask for a new one.
- **"Invite the person who will buy"** (UX §2.7, No buyer): shown in the buyers section of Group, where the invite button is. "Notify buyer" on Lists is milestone 2.
- **"Link copied"** feedback, and the Invitation screen's labels: added to UX §2.10.

## Risks / Trade-offs

- [The preview is public, so it has no per-user rate limit] → Codes are 256 random bits, so guessing one is not feasible, and the preview shows only the inviter's name, the group's name, and the type.
- [A new user who completes One last step from an invitation and then doesn't accept it has no group, and stays that way if the link is cancelled, expires, or is used by someone else] → They see "You're not in any group yet." (FR-08), and the invitation link still works for them while it is pending. The project owner accepted this until milestone 2, which adds **Create a group** (BR-07, AC-22, AC-32; PRD §8.2, increment 6) before the pilot.
- [`ALTER TYPE … ADD VALUE` can't run in the same transaction as statements that use the new value] → The migration only adds the value and the column; nothing in it uses `declined`.
- [Rounding the expiry to the nearest day can read "Expires in 1 day" with 13 hours left] → Acceptable for a 7-day link; it is never shown after expiry, because expired invitations aren't listed.
- [Writing the current-group cookie from the client after accepting] → If it fails, the shell falls back to the first group by name, as it does today.

## Migration Plan

1. One drizzle-kit migration adds `declined` to `invitation_status` and the nullable `invitee_name varchar(100)` to `invitations`. It is additive, so the deployed code keeps working until the new build is live (Infrastructure §3 applies migrations before the build).
2. Rollback: revert the code. The column and enumeration value stay, unused; Postgres can't drop an enumeration value without recreating the type, which isn't needed.
