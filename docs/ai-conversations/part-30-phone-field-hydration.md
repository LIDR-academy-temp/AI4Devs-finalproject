# Chat export: Assisted Shopping Platform (part 30: Phone field hydration)

**Exported:** November 16, 2026

## About this export

- **Tool:** Claude Code, in the VS Code extension, in the project repository. Turn 1 starts on `main` and creates `fix/t-36-phone-field-hydration`, the T-36 branch; every later turn is on that branch, which also holds this export.
- **Model:** Claude Opus 5.5 (Anthropic) · **Effort:** the level already set when the session started; it wasn't changed during the session.
- **Session:**
  - Turn 1 starts ticket T-36, Phone field hydration: the branch, the issue on the board, and the OpenSpec proposal through `/opsx:propose`.
  - Turn 2 adds two changes to the proposal through `/opsx:update`, commits it, and implements it through `/opsx:apply`: the tests first, seen failing, then the fix in `PhoneField`.
  - Turn 3 is a merge check against `main`, with no file changes.
  - Turn 4 adds the country-and-save tests to the ticket, opens pull request #95, and acts on its adversarial review.
  - Turn 5 fixes the CI browser-test failure in Linux WebKit.
  - Turn 6 archives the OpenSpec change and records this session.
- **Subagents:** `adversarial-reviewer`, once, on pull request #95. Its report isn't reproduced here. Its findings are in a comment on the pull request.
- **Source:** the session's context. Every turn is in it, so none is missing or reconstructed.
- **What's included:** every prompt, copied as written, and the visible text of each response, in order. Turns 2 to 4 were pasted into the chat, and are copied as pasted. In turns 4 and 5, the work continued without a new prompt after background work finished; those points are marked.
- **What's left out:**
  - system instructions, internal reasoning, and tool call details. Tool activity is summarized in one line, and files are named instead of embedded;
  - the text of the skills that slash commands load (the OpenSpec skills and the commit skill);
  - messages from the tool itself, such as the notices that background work finished, the subagent's report, and the files the editor reported as opened;
  - the full pull request description and review comment, which are on pull request #95;
  - what happens after the commit that contains this export: the push, and turn 6's closing message.
- **Formatting:** links in the responses are shown as plain text.

---

## Turn 1

### Prompt

```text
Start T-36
```

### Response

On the T-36 branch now, and the issue is In Progress. Next I'm reading the phone field code and the existing specs so I can draft the OpenSpec proposal.

I've found the cause in phone-field.tsx: it builds the full country list with `Intl.DisplayNames` during the server render. Now I'm creating the OpenSpec change and writing its artifacts.

Proposal and delta specs are written. Now the design (how the field waits for hydration, and how the tests catch the error in a production build), then the tasks.

I've written the T-36 proposal and it passes `openspec validate --strict`. I haven't changed any code; I'm waiting for your approval before `/opsx:apply`.

**Done so far:** I created the branch `fix/t-36-phone-field-hydration` from an up-to-date `main` and moved issue #92 to In Progress. The change is in openspec/changes/t-36-phone-field-hydration/, with a proposal, design, tasks, and delta specs for `onboarding` and `profile`.

**Scope as I understood it**
- **The fix:** right now phone-field.tsx builds all the country options on the server. The server and the browser then end up with different country names and order. After the fix, the server renders only the "choose a country" placeholder and the selected country. The full list, with the browser's names and order, is built once the page has hydrated.
- **New tests:** one browser test on One last step and one on Profile. Each loads the screen in Spanish and English, runs in Chromium and WebKit, and fails if the page reports a hydration error. They're named `T-36 …` because the ticket has no AC IDs (§2.6). I'll run them against the current code first to confirm they fail before I change the field.
- **No document changes:** the ticket's Approach already describes the fix.

**Assumptions to check**
1. **How the field detects hydration:** I'll use React's `useSyncExternalStore` rather than `useEffect` plus state or `next/dynamic` with SSR turned off. It keeps the field in the server HTML, so nothing shifts on load, and it doesn't trip the lint rule against setting state in an effect.
2. **The selected country can mismatch too:** the selected country's own name can still differ between server and browser (a saved Hong Kong number in Spanish, for example). I'll keep the hydration warning off for that one option and give it a separate key, so the browser's option replaces it after hydration. Otherwise the ticket's approach would still fail for those users.
3. **The tests watch hydration errors only:** they collect hydration errors from the page's errors and console, not every console error. Profile still logs T-37's `FORMATTING_ERROR` until T-37 merges, so a broader check would fail for a reason outside this ticket.
4. **A short list before JavaScript loads:** until the page hydrates, the country select offers only the placeholder and the selected country. Existing tests already wait for hydration, and Playwright's `selectOption` waits for the option it picks to exist.

**Nothing in the documents is left open or contradictory.** Neither screen is In progress in design/screens.md: One last step is Restyled and Profile is Placeholder.

Once you approve, I'll commit the proposal on its own and run `/opsx:apply`.

*Tool activity: read the T-36 ticket and the workflow sections of docs/08-WORK-TICKETS.md, `PhoneField` and its two users, the OpenSpec configuration and the onboarding and profile specs, the browser tests and their helpers, the Playwright configuration, and Security and testing §2.6; created `fix/t-36-phone-field-hydration` from an updated `main`; moved issue #92 to In Progress on the project board; ran `/opsx:propose`, which created the change and its proposal, delta specs, design, and tasks; validated the change.*

## Turn 2

### Prompt

```text
Proposal approved, with two additions:
1. Add a delta spec: one scenario in openspec/specs/onboarding and one in
   openspec/specs/profile, each saying the screen loads without a
   hydration error in Spanish and English. Cite T-36, since there's no AC
   ID. Name the tests after the scenarios.
2. The Profile test also covers a saved number whose country name differs
   between Node and the browser, such as Hong Kong in Spanish, so the
   selected-option handling in assumption 2 is tested.
Update the change with these, commit the approved proposal on its own,
then run /opsx:apply.
```

### Response

Got it. I'll fold both additions into the change with `/opsx:update`, commit the proposal on its own, then apply.

Confirmed: Node calls Hong Kong "RAE de Hong Kong (China)" in Spanish, while Chromium and WebKit both say "Hong Kong", so it's a real mismatch in both browsers. Updating the change now.

Using change: t-36-phone-field-hydration (override with `/opsx:update <other>`).

Your message already spells out both revisions and approves them, so I'm writing them directly. They touch all four artifacts:

- **Specs, onboarding and profile:** I'm renaming each scenario to "T-36 … loads without a hydration error in Spanish and English" and adding a T-36 citation to the scenario itself. The Profile scenario also gains a saved Hong Kong number in Spanish, and the selector must show the browser's name for it.
- **Proposal:** the browser-tests bullet now mentions the Hong Kong case.
- **Design, decision 3:** the Profile test now covers the selected-option replacement from decision 2.
- **Tasks:** the test names now match the scenarios, and task 1.3 adds the Hong Kong load. Task 1.4 now expects the Hong Kong case to fail before the fix as well.

The change is updated and still passes strict validation. Committing the approved proposal on its own now.

Proposal committed (`1d10940`). Starting `/opsx:apply`.

Using change: t-36-phone-field-hydration (override with `/opsx:apply <other>`). Schema spec-driven, 0/9 tasks done. The apply guidance (don't restyle, stop if UI changes are needed) fits: this ticket's scope is the phone field's rendering, and it changes nothing visible.

Starting with task 1.1, the hydration-error helper.

Adding the helper to tests/e2e/support.ts.

Task 1.1 done; `tsc` passes. Now the One last step test (task 1.2).

Task 1.2 test written. Now the Profile test (task 1.3), including the Hong Kong case.

I left a stray placeholder in that test. Cleaning it up to compare against the exact expected label.

Both tests pass lint and `tsc`. Marking tasks 1.1–1.3 done and running them against the current field (task 1.4). The suite builds the app first, so this takes a few minutes.

All four runs fail against the current field, as task 1.4 expects: React's production hydration error #418 shows up on both screens in Chromium and WebKit.

One thing to handle: in WebKit, the Profile error from the Spanish load only arrived during the English load. Before the fix, the select already has its React props partway through hydration, so the tests' wait can end early. After the fix, the full list only appears after hydration has committed. I'll make the tests wait on that and say why in a comment. Saving the failing output for the PR first.

Recording the reason for the wait in the tests' comments, then the fix itself (tasks 2.1 and 2.2).

Now the fix in phone-field.tsx.

The fix passes lint and `tsc`. Marking tasks 2.1 and 2.2 done and running the T-36 tests again (task 2.3).

All four pass. To check that the Hong Kong case really exercises decision 2, I'll briefly take out `suppressHydrationWarning`. The Profile test should then fail, on Hong Kong only.

Confirmed: without the suppression, only the Hong Kong case fails (#418 in both browsers), so the test guards decision 2. The fix is restored. Marking task 2.3 done and running the full browser suite (task 3.1).

Full browser suite: 328 passed, 2 skipped, none failed. Checking that the 2 skips are pre-existing, then running lint, `tsc`, and the unit and integration tests (task 3.2).

All 9 tasks are done and checked. Committing the implementation (CLAUDE.md asks for a commit per request).

T-36 is fixed: One last step and Profile now load without the hydration error, in Spanish and English, in Chromium and WebKit. All 9 tasks in `tasks.md` are done, and it's committed on `fix/t-36-phone-field-hydration` in two commits: the proposal on its own (`1d10940`), then the fix and tests (`47c7ff7`).

**Your two additions**
1. **Delta specs:** `onboarding` and `profile` each have one scenario citing T-36: "T-36 One last step loads without a hydration error in Spanish and English" and "T-36 Profile loads without a hydration error in Spanish and English". The browser tests have the same names.
2. **Hong Kong case:** the Profile test also opens Profile in Spanish for a user whose saved number is from Hong Kong (`+85221234567`). Node calls it "RAE de Hong Kong (China)"; Chromium and WebKit call it "Hong Kong". The test checks that the selected option shows the browser's name. It also checks that Node and the browser really disagree, so the case can't quietly stop testing anything.

**The fix** (phone-field.tsx): until the page has hydrated, the country select holds only the placeholder and the selected country. The full list, with the browser's names, is built after that. The selected country's own option skips the text comparison during hydration, then gets replaced by the browser's option.

**How it was checked**
- **Before the fix:** both new tests failed in both browsers with React's hydration error #418.
- **Hong Kong guard:** with the selected option's text comparison turned back on, only the Hong Kong case failed, in both browsers. So that test is what protects that part of the fix.
- **After the fix:**
  - The T-36 tests pass (4 of 4).
  - The full browser suite has 328 passed and 2 skipped. Both skips were already in the code: a `test.skip` in `group.spec.ts` and one in `app-shell.spec.ts`.
  - `npm run lint`, `npx tsc --noEmit` and `npm test` (631 tests) pass.
- **Test wait:** before the fix, the tests' hydration wait could end before React had reported the error. In WebKit, the error from the Spanish Profile load only showed up during the English load. The tests now wait for the full country list, which only appears once hydration has finished, and a comment there says why.
- **Saved output:** I kept the failing pre-fix output for the PR in a file in the session's scratchpad.

There's no PR yet, so nothing is pushed. Tell me when to open it.

*Tool activity: compared Hong Kong's and the Falkland Islands' names in Node, Chromium, and WebKit; checked a Hong Kong number with libphonenumber-js; ran `/opsx:update` and revised the specs, proposal, design, and tasks; validated the change; committed the proposal; ran `/opsx:apply`; added `collectHydrationErrors` to `tests/e2e/support.ts` and the two T-36 tests to `onboarding.spec.ts` and `profile.spec.ts`; ran them against the unchanged field and saved the failing output; changed `PhoneField`; ran the T-36 tests, then once more with the selected option's suppression removed and restored; ran the full browser suite, lint, the type check, and the unit tests; marked the tasks; committed.*

## Turn 3

### Prompt

```text
Merge check. Compare this branch with main. Confirm the diff changes only
src/components/phone-field.tsx, the two T-36 browser tests, and the
OpenSpec change for T-36, and that no styling changed. For each scenario
in openspec/specs/onboarding and openspec/specs/profile, and the two new
T-36 scenarios, confirm its test passes. Confirm the country list still
offers every country after the page loads, in Spanish and English, and
that choosing a country and saving still works on One last step and
Profile. Report what you find. Don't edit any files.
```

### Response

Read-only check, no edits. Starting with the diff against `main`.

Diff and styling look as expected, apart from one extra file, covered in the report. Now mapping each scenario in the `onboarding` and `profile` specs to its tests.

No existing test changes the country and then saves:
- On One last step, the tests that save run with an `en-US` browser, where the default country is already US, so their `selectOption("US")` doesn't change anything.
- The `es-ES` test that does pick a new country (AC-99) doesn't save.
- On Profile, no test picks a country at all.

To cover that without editing repo files, I'll write a throwaway Playwright spec and config in the scratchpad. It runs against the same production build and test database. First, the existing spec-linked tests.

Browser tests: 96 passed, none failed. Now the integration tests for the endpoint scenarios.

Integration: 20 passed. Last, the throwaway check that choosing a different country and saving works on both screens. It lives in the scratchpad, with nothing in the repo.

The branch is ready to merge. It changes the phone field, the two test files, one shared test helper, and the T-36 OpenSpec change; no styling changed, and every check passed. I didn't edit any files; the working tree is clean.

**The diff.** The branch has two commits on top of the current `main` (`9d0e5c5`, the same as `origin/main`) and changes 10 files:
- `src/components/phone-field.tsx`.
- `tests/e2e/onboarding.spec.ts` and `tests/e2e/profile.spec.ts`: the two T-36 tests.
- The six files in `openspec/changes/t-36-phone-field-hydration/`.
- One file you didn't list: `tests/e2e/support.ts`, which adds the shared `collectHydrationErrors` helper (27 lines, test code only). The proposal's Impact section names it, so it's planned.

**No styling changed.** No `className`, `cn()`, `fieldClassName` or `style` line changed, and no CSS, Tailwind or DESIGN.md file is in the diff. The phone field's changes only affect which `<option>` elements are rendered.

**Every scenario's test passes**, in Chromium and WebKit for the browser tests:

| Spec | Scenarios | Result |
| --- | --- | --- |
| `onboarding` | 22: the Welcome scenarios (FR-37, AC-99, T-04), where users are sent (T-04, FR-08), One last step (AC-99, AC-98, AC-02, AC-03, T-04), getting started (BR-06, BR-04, T-04), invitations (BR-06, T-08) | All pass |
| `profile` | 10: FR-04 ×3, BR-32, T-04 ×4, AC-04, AC-99, BR-03 | All pass |
| T-36 delta | "T-36 One last step loads without a hydration error in Spanish and English" and "T-36 Profile loads without a hydration error in Spanish and English" | Both pass |

- **Browser tests:** I ran the Welcome, One last step, Profile and Invitation test files, which hold the browser tests for these scenarios: 96 passed, none failed.
- **Integration tests:** the `POST /me/onboarding` and `PATCH /me` endpoint tests: 20 passed.
- **Test names:** a few tests start with the scenario's ID but are worded differently. For example, the scenario "AC-98 the Welcome language is prefilled and can be changed" is tested by "AC-98 language prefilled on One last step". That was already the case on `main`.

**The country list still offers every country** once the page loads, in Spanish and English, on both screens. Both T-36 tests check that the select holds every country plus the placeholder, with names in the page's language.

**Choosing a country and saving still works on both screens.** No existing test actually changes the country and then saves:
- On One last step, the tests that save run in an `en-US` browser, so picking US doesn't change the default, and the `es-ES` test that picks a new country doesn't save.
- On Profile, no test picks a country at all.

So I ran a throwaway Playwright spec from the scratchpad against the same production build and test database: 8 of 8 passed. On One last step, starting from the default Spain, choosing Mexico (Spanish) or the United Kingdom (English) saved `+525512345678` and `+447400123456`. On Profile, changing from US to the same countries saved the same numbers, and the country was still selected after a reload. The spec is in the session's scratchpad. If you want that gap covered for good, adding it to the browser tests would need a small follow-up.

*Tool activity: compared the branch with `main` and `origin/main`; searched the diff for styling changes; matched every scenario in the onboarding and profile specs and the T-36 delta specs to its tests; ran the Welcome, One last step, Profile, and Invitation browser tests and the onboarding and profile endpoint tests; checked how both forms set the starting country; wrote a throwaway Playwright configuration and spec in the scratchpad and ran it against the production build; confirmed the working tree was unchanged. No project file changed.*

## Turn 4

### Prompt

```text
Add the country-and-save check to this ticket instead of a follow-up:
move your throwaway spec into the browser tests, one test on One last
step and one on Profile, each choosing a country other than the default,
saving, and checking the saved number, and on Profile that the country
stays selected after a reload. Name them with the AC ID that covers
saving the WhatsApp number if there is one, otherwise starting with
T-36 (docs/07-SECURITY-AND-TESTING.md §2.6). Run them in Chromium and
WebKit with the T-36 tests, commit, and then open the PR. In the PR
description, include the pre-fix test output and mention the shared test
helper change.
```

### Response

First, checking the PRD for an AC that covers saving the WhatsApp number.

No AC covers saving a valid number with a chosen country: AC-03 is the invalid number and AC-04 is removing it. So, per §2.6, the tests start with T-36. The plan changes, so I'll update the OpenSpec change first, as CLAUDE.md asks.

Using change: t-36-phone-field-hydration (override with `/opsx:update <other>`). You've specified the revision, so I'm writing it to all four artifacts:

- **Specs:** a T-36 country-and-save scenario on each screen.
- **Proposal:** the browser-tests bullet mentions the new tests.
- **Design:** a goal that choosing a country and saving still works after the fix.
- **Tasks:** a new group 4 for the two tests and their run, plus the preamble's scenario list.

Change updated and still valid. Now writing tests 4.1 and 4.2, carrying the delta into code as the apply workflow does.

All four T-36 tests pass in Chromium and WebKit (8 of 8). Now the step 1 checks for finishing the ticket: lint, `tsc`, and `npm test`.

Lint, `tsc` and `npm test` (631 tests) pass, and no unchecked task is left in `tasks.md`. Committing.

Committed (`5ad1835`). Now pushing and opening the PR. First checking the remote and any PR template.

PR #95 is open. Step 3 is the adversarial review. First checking whether the PR has CI check runs, since that decides whether `npm test` output goes in the comment.

The PR has CI check runs, so the review comment doesn't need the `npm test` output. Starting the `adversarial-reviewer` subagent on PR #95.

The adversarial review of PR #95 is running in the background. When it finishes, I'll post its findings as a PR comment, fix what's warranted, and give you the PR URL.

*The review finished in the background, and the work continued without a new prompt.*

The review found no blockers and recommends merging once CI is green. It raised four minor points. Posting the findings to the PR, then checking CI.

Every CI check has passed except `e2e`, which is still running. Of the four points, only the first needs a change: design.md doesn't yet say that the field needs JavaScript. I'm adding that, plus a note on the second point. The last two are optional test hardening for errors outside the phone field, so I'm leaving the tests as they are.

PR #95 is open: https://github.com/ojordan0/AI4Devs-finalproject/pull/95

The review found no blockers, and I posted its findings as a PR comment. I recorded its first two points as accepted trade-offs in design.md: the country list needs JavaScript, and only Profile tests a country whose name differs between Node and the browser. The last two are optional test hardening for hydration errors outside the phone field, and I left them unresolved. In CI, `lint`, `typecheck`, `test`, `openapi`, `audit` and `doc-links` passed; `e2e` was still pending when I last checked, and pushing the design note started a new run.

*Tool activity: searched the PRD's acceptance criteria for the WhatsApp number; ran `/opsx:update` and added the country-and-save scenarios, a design goal, and task group 4; added "T-36 a country chosen on One last step is saved" and "T-36 a country chosen in Profile is saved and stays selected"; ran the four T-36 tests, lint, the type check, and the unit tests; committed; pushed and created pull request #95 with the pre-fix output; ran the `adversarial-reviewer` subagent; posted its findings as a PR comment; recorded two accepted trade-offs in design.md; committed and pushed.*

## Turn 5

### Prompt

```text
e2e check failed. Review and fix the issue
```

### Response

CI ran the full browser suite: 331 passed and 1 failed, the T-36 Profile test in WebKit, on both attempts.

**Cause:** it isn't a hydration error. The test failed on its own sanity check, "the names differ, so the case is meaningful". CI's Linux WebKit uses the system's ICU data, which names Hong Kong "RAE de Hong Kong (China)" in Spanish, exactly as Node does. So in that environment the server's and the browser's names match, and the precondition doesn't hold. Chromium ships its own ICU data ("Hong Kong") and passed the same check in CI, so it still exercises decision 2 there.

**Fix:** require the names to differ only in Chromium, where they reliably do. In other browsers, record a test annotation instead of failing, and keep the no-hydration-error and browser-name checks everywhere. The OpenSpec change and design say "Chromium and WebKit" differ, so I'll correct them first with `/opsx:update`.

Using change: t-36-phone-field-hydration. Finding every place in the change that states the Hong Kong difference.

The fact appears in four artifacts. You asked me to fix the failure, so I'm writing the corrections directly:

- **Proposal:** Node's name differs from Chromium's; WebKit on Linux can match Node.
- **Design, decision 3:** what CI showed, and why only Chromium has to differ.
- **Profile spec:** Hong Kong is a country whose name *can* differ between server and browser.
- **Tasks:** task 1.3 is reworded, and a new task 5.1 covers the fix.

Change corrected and still valid. Now the code change for task 5.1 in profile.spec.ts.

All T-36 tests pass locally in both browsers (8 of 8). Running lint and the unit tests, then committing and pushing so CI can confirm.

Pushed `813b7bf`. While CI runs, I'm correcting the PR description: it says both browsers name Hong Kong differently from Node, which isn't true on Linux.

The PR description is updated, and the new CI run is going in the background. Once it finishes I'll check task 5.1 off if `e2e` passes, or dig into it if it doesn't.

*The CI run finished in the background, and the work continued without a new prompt.*

All seven checks pass on `813b7bf`, `e2e` included. Checking off task 5.1 and pushing.

I fixed the failing `e2e` check, and all seven CI checks now pass on PR #95.

**What failed:** the T-36 Profile test in WebKit. It wasn't a hydration error. The test also checks that Node and the browser name Hong Kong differently in Spanish, to prove the case is worth testing. On CI's Linux machine, WebKit names it "RAE de Hong Kong (China)", the same as Node, so that check failed. On macOS, WebKit says "Hong Kong", which is why it passed locally.

**The fix** is in profile.spec.ts:
- The "names differ" check now runs only in Chromium. Chromium carries its own country-name data, which says "Hong Kong" on every platform, so the selected-option fix is still tested on every run, CI included.
- In other browsers, the test notes whether the names differed instead of failing.
- The no-hydration-error check and the check that the selected country shows the browser's name still run in both browsers.

**Also updated:**
- **OpenSpec change:** the proposal, the design and the Profile scenario now say only Chromium is sure to differ, and a new task 5.1 covers the fix. It's checked off.
- **PR description:** corrected to match.

`813b7bf` is the fix and `7a0194a` checks off the task; both are pushed. Locally, the four T-36 tests passed in both browsers, and lint and `npm test` (631 tests) pass.

https://github.com/ojordan0/AI4Devs-finalproject/pull/95. The review's last two optional suggestions are still open: re-checking for errors after the page goes idle, and widening the error-code match.

*Tool activity: read the failed CI run's log; ran `/opsx:update` and corrected the proposal, design decision 3, and the Profile scenario, and added task 5.1; limited the Hong Kong name check in `profile.spec.ts` to Chromium, with a test annotation in other browsers; ran the T-36 tests, lint, and the unit tests; committed and pushed; corrected the PR description; waited for CI in the background; marked task 5.1; committed and pushed.*

## Turn 6

### Prompt

```text
PR is ready to merge
```

### Response

Running step 5: archive the OpenSpec change, point the PR's OpenSpec link at it, record the session, then commit and push. Starting with `/opsx:archive`.

Using change: t-36-phone-field-hydration (override with `/opsx:archive <other>`).

All four artifacts are done, and so are all 13 tasks. Sync state: each delta spec adds one requirement that isn't in the main specs yet:
- **`onboarding`:** "One last step loads without a hydration error", with two scenarios.
- **`profile`:** "Profile loads without a hydration error", with two scenarios.

Earlier tickets were archived with their specs synced, so I'm taking the recommended option and syncing now.

Both main specs now hold the added requirements and their scenarios, and all 25 specs pass strict validation. Moving the change to the archive.

The change is archived to `openspec/changes/archive/2026-11-16-t-36-phone-field-hydration/`. Archiving moves the files one folder deeper, which can break relative links, so I'm running the link check.

The link check passes, but it may not scan the archive. Comparing with how earlier archived changes write their links.

The link check deliberately skips `openspec/changes/archive`, and earlier archives such as T-08 keep the same `../../../` links. So this archive follows the repo's convention and I'm leaving the links as they are. Next, the PR's OpenSpec link. Checking how T-08's PR pointed to its archived change.

The PR link now points to the archived change, worded as T-08's was. Next is the AI usage record. Reading the existing exports and `prompts.md` to match their format.

`prompts.md` already holds 3 prompts in every section, the template's maximum, so this session adds only its Sessions row, as the last few sessions did. Writing the export as part 30.

*Tool activity: ran `/opsx:archive`; synced the added requirements into `openspec/specs/onboarding/spec.md` and `openspec/specs/profile/spec.md` and validated every spec; moved the change to `openspec/changes/archive/2026-11-16-t-36-phone-field-hydration/`; ran the link check; pointed the PR description's OpenSpec link to the archived change; wrote this export; added the session's row to prompts.md; committed.*
