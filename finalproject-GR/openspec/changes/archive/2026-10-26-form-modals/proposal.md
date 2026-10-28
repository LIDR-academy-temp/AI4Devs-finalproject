# Proposal

## Why

New Execution and New Bug open as modals, but New Test Case replaces the right-hand detail pane with an inline card. That's inconsistent, and it hides the selected item while you type. PRD §7.1 already says "The New Test Case modal opens", so the card is a deviation. The two existing modals also each hand-build the same layout (title, scrollable body, inline error, Cancel and submit buttons) with small differences in width and button order. One shared component makes all three look and behave the same, and keeps them that way.

## What Changes

- New shared `FormDialog` component (web): a modal with a title, an optional description, a scrollable form body, the server error shown inline, and a footer with **Cancel** and a primary submit button that's disabled while saving. Esc, the close button, or clicking outside closes it without saving. Three widths: default, wide, extra-wide.
- **New Test Case** becomes a modal built on `FormDialog`, with the same fields as today: name, destination folder picker, optional Gherkin script. It opens from the Test Cases header button and from "New test case here" in a folder's actions menu. On save it closes and the new test case is selected and shown in the detail pane. On cancel nothing changes, and the selection behind the modal stays as it was.
- **New / Edit Execution** and **New Bug / File bug for this run** are rebuilt on `FormDialog`. Their fields, validation and API calls don't change.
- Submit button labels stay specific ("Create test case", "Create execution" / "Save changes", "File bug").

Out of scope:
- The folder name, Move to…, and confirmation dialogs (delete, Run All mode). They aren't create/edit forms.
- The disabled "Generate from Sources" mode from PRD §7.1.
- Any API change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-ui-foundation`: adds a requirement that create and edit forms open in one consistent modal (layout, closing, saving state, inline errors).
- `test-cases-screen`: adds a requirement that New Test Case opens as a modal and selects the created test case. The existing destination-folder requirement is unchanged.

## Impact

- **Web only:**
  - New `components/form-dialog.tsx`.
  - `components/test-cases/create-test-case-form.tsx` becomes a modal (renamed `create-test-case-dialog.tsx`).
  - `test-cases-screen.tsx` stops swapping the detail pane.
  - `execution-form-dialog.tsx` and `bugs/bug-form-dialog.tsx` move onto `FormDialog`.
  - Tests that drive the inline form (`create-test-case-form.test.tsx`, `test-case-tree.test.tsx`, `role-gating.test.tsx`) are updated.
- No API, database, or dependency change.
