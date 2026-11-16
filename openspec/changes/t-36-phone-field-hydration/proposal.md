# T-36 Phone field hydration

**Issue:** [#92](https://github.com/ojordan0/AI4Devs-finalproject/issues/92) · **Ticket:** [docs/08-WORK-TICKETS.md, T-36](../../../docs/08-WORK-TICKETS.md#t-36-phone-field-hydration) · **Branch:** `fix/t-36-phone-field-hydration`

**Covers:** Epic E-01. Stories: none. Functional requirements: none new; the fix keeps FR-02, FR-03, FR-04, and FR-37 working as built in T-04. Business rules: none. Acceptance criteria: none; the ticket's "Done when" conditions are verified as described in [Security and testing §2.6](../../../docs/07-SECURITY-AND-TESTING.md#26-coverage-targets).

## Why

The phone field builds its whole country list during the server render, with names and order from `Intl.DisplayNames`. Node's region names differ from each browser's in places (for example, Hong Kong in Spanish and the Falkland Islands in English), so the list the server sends doesn't match the one the browser renders. React reports a hydration error and renders One last step and Profile again in the browser on every load. It was found in T-22 and has been there since T-04.

## What Changes

- **Phone field (`PhoneField`):** the server renders, and the browser hydrates, only the "choose a country" placeholder and the selected country. The full country list, with names and order from the browser in the page's language, is built once the page has hydrated. Country names stay out of the code and the translation files ([DESIGN.md, Content Constraints](../../../DESIGN.md#content-constraints)).
- **Browser tests:** a test on One last step and one on Profile, each named after its scenario, load each screen in Spanish and in English and fail when the page reports a hydration error. The Profile test also loads a saved Hong Kong number in Spanish, whose country name differs between Node and the browsers, so the selected country is checked too. They run in Chromium and WebKit, like every browser test.
- **No document changes.** The ticket's Approach already describes the fix; UX §2.8 ("phone field with country selector and automatic formatting") and the screens' specs stay true.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `onboarding`: adds a requirement that One last step loads without a hydration error.
- `profile`: adds the same requirement for Profile.

## Non-goals

| Left out | Owner |
| --- | --- |
| The `FORMATTING_ERROR` from the toast provider's label, logged on every screen in the app shell, Profile included | T-37 |
| Hydration errors on other screens; the new tests check only One last step and Profile | Not planned; T-37 checks every screen for formatting errors |
| Restyling the phone field | Design tickets (T-32 for Profile) |

## Impact

- **Components (existing):** `PhoneField` in `src/components/phone-field.tsx`; its users `OnboardingForm` in `src/app/(public)/onboarding/onboarding-form.tsx` (One last step) and `ProfileForm` in `src/app/(app)/profile/profile-form.tsx` (Profile) are not changed.
- **Browser tests (existing files):** `tests/e2e/onboarding.spec.ts` and `tests/e2e/profile.spec.ts` gain the hydration tests; `tests/e2e/support.ts` gains a shared helper that collects the page's hydration errors.
- **Tables and endpoints:** none.
- **Dependencies:** none added.
