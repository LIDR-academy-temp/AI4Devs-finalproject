# Tasks

## 1. Shared component

- [x] 1.1 `apps/web/components/form-dialog.tsx` per design.md decision 1: title, optional description, three sizes, a form with a `useId` id holding children and `ActionError`, and a footer with Cancel then a submit button disabled while `pending`. Verify `form-dialog.test.tsx`:
  - renders the title and fields in a dialog
  - Cancel calls `onOpenChange(false)`
  - submit calls `onSubmit`
  - submit is disabled while pending
  - an `error` shows its message inside the dialog
  - Escape closes it

## 2. Move the existing dialogs onto it

- [x] 2.1 `ExecutionFormDialog` on `FormDialog` (`size="extraWide"`, labels "Create execution" / "Save changes"), with fields, re-seed-on-open and mutation unchanged. Verify `execution-form-dialog.test.tsx`, `executions-screen.test.tsx` and `notify.test.tsx` pass unchanged, and dragging in the Selected panel still works in the browser
- [x] 2.2 `BugFormDialog` on `FormDialog` (`size="wide"`, description for the run-linked variant, label "File bug"). Verify `bugs-screen.test.tsx`, `run-bugs.test.tsx` and `notify.test.tsx` pass unchanged

## 3. New Test Case modal

- [x] 3.1 Replace `create-test-case-form.tsx` with `create-test-case-dialog.tsx` per design.md decision 2: an inner form mounted only while open, built on `FormDialog`, with the same fields and `aria-label`s, the folder picker, and submit "Create test case". Rename and update the test file. Verify:
  - valid input calls `createTestCase` with name, script and folder, then `onCreated`
  - a missing name shows "Name is required" and nothing is sent
  - the initial folder is preselected
  - reopening after cancel shows empty fields
- [x] 3.2 `TestCasesScreen`: `creatingIn` opens the modal instead of replacing the detail pane; create closes and selects the new test case; cancel only closes. Verify updated `test-case-tree.test.tsx` and new screen tests:
  - "New test case" opens a dialog while the previously selected item's detail stays rendered
  - creating closes the dialog and selects the new test case
  - cancelling keeps "Payments" selected
  - "New test case here" on a folder preselects that folder
  - `role-gating.test.tsx` passes

## 4. Integration check

- [x] 4.1 Run root `npm run lint` and `npm run typecheck`, and the web tests; all pass. In the browser, open New Test Case, New Execution and New Bug and confirm they share the same frame (title, scrolling body, Cancel then the primary button, Esc closes)

## Workflow follow-up

- User tests manually before any commit; commit or push only when asked.
- On archive: no roadmap phase owns this; add a short note under roadmap-mvp.md Phase 9 (post-completion polish) if the user wants it recorded there.
