## Context

`PhoneField` (`src/components/phone-field.tsx`) is a client component, but Next renders it on the server too. It builds its `<option>` list in a `useMemo` from `getCountries()` and `Intl.DisplayNames`, sorted with `localeCompare`. Node's ICU data and each browser's give different names for a few regions, so both the text and the order of the options can differ (see proposal.md, Why). The browser tests run against a production build (`playwright.config.ts`), where React reports a hydration mismatch as a recoverable error, not with the development overlay.

## Goals / Non-Goals

**Goals:**

- The server HTML and the browser's first render of the phone field are identical, whatever ICU data each side has.
- The country list's names and order are still the browser's, in the page's language, as soon as the page has hydrated.
- Choosing a country from the full list and saving works as before on both screens.
- A browser test fails whenever One last step or Profile reports a hydration error, in a production build.

**Non-Goals:**

- Moving country names into the translation files: DESIGN.md (Content Constraints) wants no hard-coded names, and the browser's names are what the field shows today.
- Changing how a number is split, formatted, or composed (`src/shared/phone.ts`).

## Decisions

### 1. Build the list only after hydration, detected with `useSyncExternalStore`

`PhoneField` gets a `hydrated` flag from `useSyncExternalStore` with a no-op subscribe, a client snapshot of `true`, and a server snapshot of `false`. During the server render and hydration React uses the server snapshot, then renders again with `true`. While `hydrated` is false, the select holds only the placeholder and the selected country; once it is true, it holds the full sorted list. The `Intl.DisplayNames` work runs only when `hydrated` is true.

- *Alternative: `useEffect` plus `useState`.* It works, but setting state in an effect is what the React lint rules warn about, and it adds a render's worth of state for something React already exposes.
- *Alternative: `next/dynamic` with `ssr: false` for the whole field.* The field would be missing from the server HTML, so the screen would shift on load and the label, number input, and error text would wait for JavaScript too.
- *Alternative: `suppressHydrationWarning` on every option.* It only silences text mismatches one level deep; a different order or count of options still breaks hydration, and the server's names would stay on screen.

### 2. The selected country's option is replaced after hydration

The pre-hydration option for the selected country is keyed apart from the full list's options (for example `initial-ES` against `ES`), and carries `suppressHydrationWarning`. Its name can still differ between server and browser, for the same regions as the list; the warning suppression covers that one text node, and the different key makes React replace it with the browser's option once the list is built, so the browser's name is what stays on screen. The select's value doesn't change, so the user sees no change unless their country is one whose name differs.

- *Alternative: show only the calling code (`+852`) before hydration.* The text would change visibly for every user on load.

### 3. A shared helper collects hydration errors, and each screen's test asserts none

`tests/e2e/support.ts` gains a helper that, before navigation, listens to the page's `pageerror` and `console` error events and keeps the messages that are hydration errors: React's minified hydration error codes in production and the "hydrat" wording in development. The new tests on One last step and Profile open the screen in Spanish and in English, wait until the phone field is hydrated (`waitUntilHydrated`) and the full country list is there, and expect the list of collected errors to be empty. The Profile test also opens the screen in Spanish for a user whose saved number is from Hong Kong: Node names it "RAE de Hong Kong (China)" and Chromium and WebKit "Hong Kong", so the selected option's text differs between server and browser. It checks that there is no hydration error and that the selected option shows the browser's name, which tests decision 2. The tests are named after their scenarios in the delta specs. Each test is written and run against the current field first, to see it fail, before the field is changed.

- *Alternative: assert on every console error.* The app-shell screens, Profile included, log T-37's `FORMATTING_ERROR` until T-37 is merged, so a broader check would fail for a reason outside this ticket.

## Risks / Trade-offs

- [Before hydration, the select offers only the placeholder and the selected country] → On a slow connection, someone who opens the select before the JavaScript runs sees a short list. Hydration on these screens takes well under a second, and the existing tests already wait for it before typing (`waitUntilHydrated`). Playwright's `selectOption` waits until the option it picks exists.
- [React's production error codes for hydration might change in a React update] → The helper matches both the error codes and the word "hydrat", and the new tests fail first against the current field, which confirms the match before the fix.
- [The extra render after hydration] → It builds about 245 options once per mount, the same work as today, which runs in the browser on every load anyway.
