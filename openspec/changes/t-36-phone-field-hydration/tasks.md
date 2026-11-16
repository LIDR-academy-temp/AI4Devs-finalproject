# Tasks

T-36 has no acceptance criterion IDs. Its scenarios are named after the ticket, as [Security and testing §2.6](../../../docs/07-SECURITY-AND-TESTING.md#26-coverage-targets) describes: "T-36 One last step loads without a hydration error in Spanish and English" (task 1.2) and "T-36 Profile loads without a hydration error in Spanish and English" (task 1.3). The ticket's "Done when" conditions map to them as follows: no hydration error on either screen in Spanish and English, in Chromium and WebKit (tasks 1.2, 1.3, and 3.1); a browser test on each screen that fails on a hydration error (tasks 1.4 and 3.1); and all tests pass (group 3). Of the definition of done, item 3 applies (group 3; no endpoint changes, so the OpenAPI document is unchanged). Items 4 and 5 don't: no interface text is added, and no behavior a document owns changes (proposal.md, What Changes).

## 1. Tests first

- [x] 1.1 In `tests/e2e/support.ts`, add a helper that starts collecting a page's hydration errors from its `pageerror` and console error events, matching React's production hydration error codes and the word "hydrat" (design decision 3). Verify with `npx tsc --noEmit`.
- [x] 1.2 In `tests/e2e/onboarding.spec.ts`, add "T-36 One last step loads without a hydration error in Spanish and English", named after its scenario: for Spanish and then English, a new user opens `/onboarding`; the test waits until the phone field is hydrated and the country selector offers a country with its name in that language, then expects no hydration error.
- [x] 1.3 In `tests/e2e/profile.spec.ts`, add "T-36 Profile loads without a hydration error in Spanish and English", named after its scenario: for Spanish and then English, an onboarded user opens `/profile`; the test waits until the phone field is hydrated, checks that the country selector shows the saved number's country and offers a country with its name in that language, then expects no hydration error. It also opens Profile in Spanish for a user whose saved number is from Hong Kong (`+85221234567`), and checks that the selected option shows the browser's name for Hong Kong, not Node's, with no hydration error (design decision 2).
- [x] 1.4 Run both tests against the current `PhoneField` with `npm run test:e2e -- --grep T-36`, in Chromium and WebKit, and confirm they fail on the hydration error, including the Hong Kong case. Record the failing output for the pull request.

## 2. Phone field

- [x] 2.1 In `PhoneField` (`src/components/phone-field.tsx`), get a `hydrated` flag from `useSyncExternalStore` (server snapshot `false`, client snapshot `true`), and build the `Intl.DisplayNames` list only when it is true (design decision 1).
- [x] 2.2 Before hydration, render only the placeholder and, when a country is selected, its option with a key apart from the full list's and `suppressHydrationWarning`; after hydration, render the placeholder and the full list (design decision 2). Update the component's comment to say why.
- [x] 2.3 Run `npm run test:e2e -- --grep T-36` in Chromium and WebKit and confirm both tests pass.

## 3. Checks

- [x] 3.1 Run the whole browser suite (`npm run test:e2e`), confirming the existing One last step and Profile tests (AC-98, AC-99, AC-02, AC-03, AC-04, FR-04, and the accessibility checks) still pass in Chromium and WebKit.
- [x] 3.2 Run `npm run lint`, `npx tsc --noEmit`, and `npm test`, and confirm they pass.
