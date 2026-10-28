# Design

## Context

See proposal.md - Why. Current state (`apps/web`):

- `execution-form-dialog.tsx` and `bugs/bug-form-dialog.tsx` both hand-build: `Dialog` → `DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-…"` → `DialogHeader`/`DialogTitle` → `<form id="…">` with fields and `<ActionError>` → `DialogFooter` with Cancel (outline) then submit (`form="…"`, `disabled={isPending}`).
  - Widths differ: `4xl` for executions with the two-panel picker, `xl` for bugs.
  - Both keep `useForm` in the always-mounted component and re-seed it on open (`useEffect` on `open` / `reset`).
- `test-cases/create-test-case-form.tsx` is a `Card` that `TestCasesScreen` renders **instead of** the detail pane while `creatingIn !== undefined`.
  - `onAction('newTestCase', node)` sets `creatingIn` to the destination folder.
  - The card's submit button reads "Create", and its error is a bare `<p role="alert">`.
- `components/ui/dialog.tsx` is shadcn's Radix dialog. Radix unmounts `DialogContent` children when closed, gives Esc, close button, outside-click and focus trap handling, and offers `showCloseButton`.

## Goals / Non-Goals

**Goals:**
- One component owns the modal frame for create and edit forms. Each form owns only its fields, validation and mutation.
- The test case modal reuses the existing fields, folder picker and mutation as they are.

**Non-Goals:**
- Converting confirmation and small single-field dialogs (folder name, Move to…, delete, Run All mode). They keep using `Dialog` directly.
- An unsaved-changes prompt on close (the spec says closing discards).

## Decisions

**1. `FormDialog` API (`components/form-dialog.tsx`).**
```tsx
<FormDialog
  open onOpenChange
  title="New bug" description?={…}
  size?="default" | "wide" | "extraWide"   // sm:max-w-lg | sm:max-w-xl | sm:max-w-4xl
  submitLabel="File bug"
  pending={save.isPending}
  error={save.error}                         // rendered with ActionError inside the form
  onSubmit={handleSubmit((v) => save.mutate(v))}
>
  …fields…
</FormDialog>
```
- It renders `Dialog` → `DialogContent` (`max-h-[90vh] overflow-y-auto` plus the size class) → header → `<form id={useId()} noValidate onSubmit>` holding the children and `ActionError` → `DialogFooter` with Cancel (`variant="outline"`, calls `onOpenChange(false)`) then the submit button (`type="submit" form={id} disabled={pending}`).
- The form id comes from `useId()`, so two dialogs can never collide on `id="…-form"`.

*Alternative:* a context-based compound API (`<FormDialog.Header>`, `<FormDialog.Footer>`). Rejected: every form has the same frame, and props keep call sites short.

**2. Reset semantics.**
- The execution and bug dialogs keep their existing re-seed-on-open logic. It already satisfies "reopening starts fresh", and edit mode needs it.
- `CreateTestCaseDialog` (props: `open`, `onOpenChange`, `projectId`, `folders`, `initialFolderId`, `onCreated`) renders `{open && <CreateTestCaseForm …/>}`. The inner component owns `useForm` and the mutation, and renders `<FormDialog open …>` itself. Closing unmounts it, so each opening starts from the defaults (with `initialFolderId`) and no reset effect is needed.

*Alternative:* a `reset()` effect on open, as the other two dialogs use. Rejected for a create-only form: unmounting is simpler and can't leave stale state.

**3. `TestCasesScreen`.** `creatingIn` (destination folder or `undefined`) now drives the modal's `open` instead of swapping the detail pane. On create: close, `setSelected({ kind: 'testCase', id })`. On cancel: close only, and the selection is untouched. The "New test case" header button and "New test case here" keep calling `onAction('newTestCase', node)`.

**4. Labels and accessibility.**
- Submit labels:
  - test case: "Create test case"
  - execution: "Create execution" / "Save changes"
  - bug: "File bug"
- The test case fields keep their `aria-label`s ("New test case name", "New test case script") so tests and screen-reader names stay stable.
- Validation messages switch from a bare `<p role="alert">` to the shared `text-sm text-destructive` style used by the other two dialogs.

## Risks / Trade-offs

- [Moving `useForm` into an unmount-on-close child changes when the test case form resets] → That's the intent (spec: reopening starts fresh). The existing tests for submit values and folder default carry over.
- [A wider execution dialog inside the shared frame] → The `extraWide` size keeps today's `sm:max-w-4xl`, and the Selected panel's `DragOverlay` portal fix (Phase 9 Slice 3) is untouched because it lives inside the children.
- [Tests that find the inline card] → `test-case-tree.test.tsx` and `create-test-case-form.test.tsx` are updated to find the dialog (`getByRole('dialog')`).
