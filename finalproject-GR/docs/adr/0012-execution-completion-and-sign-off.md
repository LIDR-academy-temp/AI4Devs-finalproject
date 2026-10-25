# ADR 0012: Execution Completion, Sign-off and Test Case Eligibility

**Status:** Accepted
**Date:** 2026-10-25
**Amends:** [ADR 0005](0005-realtime-and-background-jobs-v1.md) (refines its domain rule that the execution lifecycle is a DB-persisted state machine by fixing the edges the PRD left open; resolves open questions G6 and G11)

## Context

[ADR 0005](0005-realtime-and-background-jobs-v1.md) made the execution lifecycle (Draft, Ready, In Progress, Paused, Completed, Done, Canceled) a domain state machine persisted in the database, but [PRD.md](../../PRD.md) §6.3.4 only lists the actions available in each status. It does not say:

- what moves an execution from In Progress to **Completed** (no action in the table produces it), or how a run left in **Needs Review** is handled before an Admin's **Sign Off** (open question G6);
- which execution statuses count as "active" for PRD §6.2.5's rule that a test case cannot be deleted while it is part of an active execution;
- which test case statuses (Draft, Ready, Deprecated) may be selected into an execution (§7.2 — new open question G11).

All three had to be fixed before the `execution-lifecycle` OpenSpec change (roadmap-mvp.md Phase 7, Slice 1) could specify its behavior.

## Decision

1. **Completion is automatic.** When the last `Pending` run of an In Progress execution receives an outcome, the execution moves to **Completed** in the same transaction and its elapsed timer stops. `Needs Review` counts as an outcome for this purpose.
2. **Outcomes stay editable in Completed.** Contributors and above may set a run to `Pass`, `Fail` or `Needs Review` while the execution is In Progress or Completed (not while Paused, and never back to `Pending`). This is how Needs Review gets resolved.
3. **Sign Off is refused while any run is Needs Review.** An Admin's Completed → Done is allowed only once every run is `Pass` or `Fail`, so Needs Review can't become a permanent state on a signed-off execution.
4. **"Active execution" means Ready, In Progress or Paused.** Deleting a test case is refused while it has a run in an execution in one of those statuses. Draft does not count, because a forgotten Draft would otherwise pin its test cases indefinitely. Instead, **Mark as Ready** refuses an execution containing a deleted test case.
   *Correction (2026-10-25, `folder-tree`):* the Context section above says the PRD did not define "active". It did: PRD §2.11 and §6.2.5 listed Draft as blocking test case and folder deletion. The decision stands. The PRD has been amended to match it, and folder deletion follows the same rule.
5. **Only Ready test cases can be selected into an execution.** Create and Draft edits reject Draft and Deprecated test cases, and Mark as Ready checks again, because a test case's status can change while the execution sits in Draft. After Mark as Ready, later status changes don't affect the execution; Run All snapshots the test case name and script as they are at that moment.

## Alternatives Considered

- **An explicit "Complete" action** instead of automatic completion. Rejected because the PRD's action table lists none, and it adds a click that carries no decision.
- **Allowing Sign Off with Needs Review runs remaining.** Simpler, but Needs Review would then be a status that never has to be resolved, which defeats its purpose.
- **Counting Draft as active** for the delete guard. Rejected for the reason in decision 4.
- **Allowing any non-deleted test case, or excluding only Deprecated.** The first lets obsolete tests run; the second lets unfinished Draft tests run. Ready-only matches what a test case's status is for.

## Consequences

- The automatic Completed transition is driven by the run-outcome write, so outcome writes are serialized per execution with a row lock to make concurrent "last outcome" writes complete reliably. Writes are human-paced, so contention is negligible.
- Writing a test case and running it immediately takes one extra step: setting its status to Ready. The Slice 2 picker shows only Ready test cases.
- Cancel and Try Again (and open question G7) are still undecided. The `Canceled` status exists in the schema but no transition reaches it yet.

## Revisit Triggers

- Testers routinely need to record outcomes while Paused, which would mean revisiting decision 2.
- Teams want to sign off with known open Needs Review items, for example with a mandatory comment. That would mean revisiting decision 3.
