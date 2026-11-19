# Design

## Context

- T-03 left the route wrapper (`defineRoute` in `src/server/http/route.ts`), the membership check (`resolveGroupAccess` and `requireMemberAccess` in `src/server/services/access.ts`), the domain errors, the error messages from the translation files, and the OpenAPI registry. No endpoint under `src/app/api/v1` exists yet.
- The session reader is still the placeholder that returns no user: T-04 replaces it with Better Auth. Real users can't reach these endpoints until then; tests sign in through the fake reader in `tests/support/routes.ts`.
- `defineRoute` builds the handler with the production dependencies, so a test can't swap the session reader or the clock on a real endpoint. T-03's tests only used endpoints defined inside the test files.
- Next.js only lets a `route.ts` file export the HTTP method handlers and a few settings, so a route's declaration can't be exported from the same file for tests to reuse.
- See proposal.md for why, and the specs for the required behavior.

## Goals / Non-Goals

**Goals:**

- Integration tests call the real `/api/v1` endpoints, with their real declarations, through a test session reader and clock.
- The rules for getting started and for tabs each live in one place: getting started in a service that T-04 calls, and the tabs in shared code that T-05 calls.

**Non-Goals:**

- No onboarding check in the wrapper; T-04 adds it, leaving `GET /me` out (API §1).
- No page or component.

## Decisions

### 1. Route declarations live next to their route file

Each resource folder under `src/app/api/v1` has a `definitions.ts` that declares its routes with a new `routeDefinition()` helper, and a `route.ts` that only exports `GET = defineRoute(getGroups)` and so on. `routeDefinition()` returns its argument unchanged, but its type parameters let TypeScript check the handler against the declared schemas, which a plain object constant would lose. Tests import the declarations and build handlers with `createRouteHandler(definition, testDependencies({ db }))`.

The OpenAPI script already imports every `route.ts`, which imports its declarations and registers them, so the document is unchanged by where they live.

*Alternatives:* a module-level setter that swaps the default dependencies in tests. Rejected: global state shared by every test in a file, and easy to leak between tests. Putting the declarations in `src/server/http`. Rejected: they are the API layer's per-endpoint code, which [Architecture §2](../../../docs/03-ARCHITECTURE.md#2-project-structure) puts in `src/app/api/v1`, one folder per resource.

### 2. Services take the user, language, and clock; handlers only pass them on

- `src/server/services/me.ts`: `getCurrentUser(db, userId)` reads the user, their active memberships joined with each group's name and owner, and whether any item has them as buyer with status `reserved` or `purchased`.
- `src/server/services/groups.ts`: `listGroups(db, userId)`, `getGroup(db, userId, groupId, language)`, and `startWithoutInvitation(db, clock, userId, language)`.

`getGroup` calls `requireMemberAccess` from T-03, which gives the 404 for a missing, foreign, or malformed group and the 403 for a buyer. Only then does it read the group's people, so nothing about the group is read for a user who can't see it.

The language passed in is the requesting user's, from the route context. Services translate the few texts they produce (group and list names, and "Former user" through `personName` in `src/server/services/people.ts`, which T-09 reuses for buyers) with a small translator in `src/server/translate.ts`, which reads the same message files as the error messages. The error message helper in `src/server/http/language.ts` moves onto it, so both use one translator. The `Language` type moves from `src/server/http/session.ts` to `src/shared/languages.ts`, re-exported from where it was, so services and shared code don't import the API layer for a type.

### 3. Getting started is idempotent and serialized per user

`startWithoutInvitation` runs in one transaction:

1. Lock the user's row with `SELECT … FOR UPDATE`, so two calls for the same user run one after the other.
2. If the user has any row in `memberships`, active or ended, return without creating anything. A user who has ever belonged to a group either joined by invitation or already got their group, and AC-32 (milestone 2) expects a user whose only group removed them to see "You're not in any group yet", not a new group.
3. Insert the group with the user as owner, the user's `member` membership, and the list, all with the clock's time.

It returns the new group's and list's IDs, or null when it did nothing.

**The name:** the first whitespace-separated word of the trimmed `users.name`, or the part of the email before `@` when the name is empty, put into the translation-file template. If the result is longer than 100 characters (BR-32), the first name is shortened by code points until it fits, so a long name never fails the database check. The list name comes from the translation files as is.

*Alternatives:* running it when the user row is created by Better Auth. Rejected: the language isn't confirmed until onboarding, and an invitation's type is only known when it is accepted. Checking only active memberships. Rejected: it would give a removed buyer a group on their next onboarding call, and a user's invitation acceptance (T-08) could race with it.

### 4. Response shapes

All three endpoints return objects, with collections under a property named after the resource (API §1, as proposed):

- `GET /me`: `{ id, name, email, image, language, whatsappNumber, receiveEmails, onboarded, hasPurchases, memberships: [{ groupId, groupName, type, isOwner }] }`. `language` and `whatsappNumber` are null until onboarding. `memberships` are ordered by group name, then group ID, so the order is stable.
- `GET /groups`: `{ groups: [{ id, name, type, isOwner }] }`, in the same order.
- `GET /groups/{groupId}`: `{ id, name, members: [{ id, name, isOwner }], buyers: [{ id, name }] }`, each ordered by when they joined, then user ID.

People use the `PersonRef` shape from [API §3](../../../docs/05-API.md#3-openapi-definition-of-the-main-endpoints), `{ id, name }`, where `id` is the user's ID. `personName` names a user "Former user", in the requester's language, when `users.deleted_at` is set, not merely when the name is missing: a live user whose provider gave no name is named by the part of their email before the `@` (adversarial review, finding 1). WhatsApp numbers are left out until the milestone 2 features that show them.

The schemas are registered by name in the OpenAPI registry (`Me`, `Membership`, `GroupSummary`, `GroupList`, `Group`, `GroupMember`, `PersonRef`, `MembershipType`), in `src/server/http/schemas.ts`, which imports the Zod extension first, as T-03's design requires. T-09 adds its item schemas there.

### 5. Tabs are decided by one shared function

`src/shared/navigation.ts` exports `visibleTabs({ memberships, hasPurchases })`, returning tab names in display order: `lists`, `people`, `group`, `toBuy`, `purchases`. It takes only the membership types and the purchases flag, so the interface can call it with the `GET /me` response and the server with the same data. An empty result means the user isn't in any group. The AC-24 integration test runs it on the `GET /me` response, so the test covers the endpoint and the rule together.

*Alternative:* returning the tabs in `GET /me`. Rejected: the API would carry a presentation decision, and pages reading services directly (Architecture §1.1) would still need the function.

### 6. Tests sign in any user, not only seed users

`tests/support/routes.ts` gets a `session` option on `apiRequest` that signs the request in as any session user, such as a factory user who hasn't completed onboarding, alongside the existing `as` option for seed users. The seed user list adds Pedro, the former buyer. Tests of getting started call the service directly, since its endpoint is T-04's.

## Open points in the documents

The documents left these points open or in conflict. Each was settled in the document that owns it, in this pull request; this section records why.

- **AC-25 belonged to a later ticket.** T-07 listed AC-25, which opens an item, but T-07 has no item endpoint. *Chosen:* move AC-25 to T-09, which builds `GET /items/{itemId}`. *Changed:* [Work tickets T-07](../../../../docs/08-WORK-TICKETS.md#t-07-groups-memberships-and-access) and [T-09](../../../../docs/08-WORK-TICKETS.md#t-09-lists-and-items-api), and their GitHub issues.
- **When BR-06 runs.** Nothing said when the user's own group and list are created. *Chosen:* when onboarding completes, called by T-04, and skipped by T-08 for sign-ups through an invitation, because the names need the language confirmed at onboarding and an invitation's type is only known when it is accepted (decision 3). *Changed:* the onboarding row in [API §2](../../../../docs/05-API.md#2-endpoints), FR-05 in [PRD §19](../../../../docs/01-PRD.md#19-traceability), and the scopes of [T-04](../../../../docs/08-WORK-TICKETS.md#t-04-sign-in-onboarding-and-basic-profile) and [T-08](../../../../docs/08-WORK-TICKETS.md#t-08-buyer-invitations).
- **`GET /me` before onboarding.** The onboarding check covered every endpoint, which made the `onboarded` flag of `GET /me` unreadable for the users it is meant for. *Chosen:* `GET /me` answers before onboarding, so the interface can tell where to send the user. *Changed:* [API §1](../../../../docs/05-API.md#1-conventions).
- **Who sees a group's people.** BR-12 didn't say whether buyers can open `GET /groups/{groupId}`. *Chosen:* members only, and 403 for a buyer, because the Group screen is a member screen and buyers reach the people they need through items. *Changed:* a new row in the BR-12 table, [PRD §12.3](../../../../docs/01-PRD.md#123-access-and-permissions).
- **Spanish names for the starting group and list.** The Spanish strings had no entries for them. *Chosen:* "Grupo de {nombre}" and "Mi lista", matching the English pattern. *Changed:* [UX §2.10](../../../../docs/02-UX-DESIGN.md#210-spanish-interface-strings).
- **When a member gets My purchases.** FR-08 and UX said "once they reserve", which would hide the tab while the member still has purchased items to ship. *Chosen:* while they have reserved or purchased items, the `hasPurchases` flag. *Changed:* FR-08 in [PRD §13.2](../../../../docs/01-PRD.md#132-groups-and-invitations), [UX §2.2](../../../../docs/02-UX-DESIGN.md#22-navigation), and the tab row in [UX §2.3](../../../../docs/02-UX-DESIGN.md#23-screens).
- **A user with no group but purchases to ship.** Nothing said what they see (adversarial re-review, finding 1). *Chosen:* the no-groups message, with My purchases below it, so BR-11 still lets them ship what they bought. *Changed:* [UX §2.7](../../../../docs/02-UX-DESIGN.md#27-empty-states-loading-and-errors).
- **How collections are returned.** No convention existed. *Chosen:* an object with the collection under a property named after the resource, such as `{ "groups": [...] }`, so a response can gain fields without breaking clients (decision 4). *Changed:* [API §1](../../../../docs/05-API.md#1-conventions).

No package outside [Architecture §1.6](../../../../docs/03-ARCHITECTURE.md#16-dependencies) was needed.

## Risks / Trade-offs

- [Getting started has no caller until T-04 builds onboarding.] → T-04's scope names it ([Work tickets §4](../../../docs/08-WORK-TICKETS.md#t-04-sign-in-onboarding-and-basic-profile)), and its service is tested on its own here.
- [`hasPurchases` adds a query to every `GET /me`.] → It is an `EXISTS` on `items` using the existing `(buyer_id, status)` index.
- [Locking the user row serializes a user's getting-started calls.] → They happen once per user, at onboarding.
- [The rate limit for any request is shared by all requests in a test file, under a fixed test clock.] → The permission tests stay well under 120 requests per user, and the clock can be moved if a file needs more.

## Migration Plan

No schema change and no migration. Rollback is reverting the pull request.
