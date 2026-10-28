# ADR 0013: Bug Lifecycle and Automatic Creation

**Status:** Accepted
**Date:** 2026-10-25
**Amends:** [ADR 0007](0007-activity-log-and-trash-purge.md) (adds the rules for how a bug's run link and snapshot are created, which ADR 0007 relies on for purges; resolves open questions G4 and G8)

## Context

[PRD.md](../../PRD.md) §6.4.3 lists the bug statuses (Open, In Progress, Resolved, Closed, Won't Fix) as "changeable inline", but not which changes are allowed or by whom (open question G4). §7.4 describes *Auto-create bug on failure* but not what triggers it when runs are manual (G8). [ADR 0007](0007-activity-log-and-trash-purge.md) and readme §3 already fix that a bug keeps its own snapshot of the test case name, Gherkin script and failed step, and that its run and test case links are cleared by a purge. They don't say where those values come from, and in manual mode there are no step results to identify a failed step.

These had to be fixed before the `bug-tracking` OpenSpec change (roadmap-mvp.md Phase 8) could specify its behavior.

## Decision

1. **Any status → any status, for Contributors and Admins (G4).** Status is a validated value, not a workflow. Reopening is simply Closed → Open. Every change is written to the activity log with its old and new value, so the history is never lost.
2. **Auto-create on setting a run to Fail (G8).** When a tester sets a run to `Fail` on an execution with auto-create enabled, a bug is created **in the same transaction** as the outcome. Its title is the run's test case name, it carries the run's snapshot, and it is Open with severity Medium, reported by that tester and marked as auto-created. **At most one** auto-created bug per run is allowed. A partial unique index enforces this in the database, so a run flipped Fail → Pass → Fail never gets a second one.
3. **The snapshot is always taken by the server, from the run.** Filing from a run or linking to one copies the name and script that the run recorded when its execution started. Only runs of started executions qualify; request bodies never carry snapshot text.
4. **The failed step is one line of the snapshot.** It is optional, chosen by the reporter, and stored as the trimmed text of a non-blank script line. Any other value is rejected. The detail view highlights matching lines.
5. **One run per bug; linking only adds a missing link.** An existing bug with no run can be linked to a run, taking that run's snapshot. A bug that already has a run cannot be relinked. Unlinking is out of scope for the MVP.
6. **The reporter's name is stored on the bug**, as the activity log stores actor names. Users can only read their own user record, so a join would show other reporters' names to no one.

## Alternatives Considered

- **A guided status workflow** (forward moves plus an explicit Reopen). Rejected: the PRD presents status as a free inline choice, and the activity log already gives the audit trail a workflow would protect.
- **Admin-only Closed/Won't Fix.** Rejected: §3.2 gives Contributors "file and update bugs" with no carve-out.
- **Auto-creation in a background job.** Rejected: a bug missing after a successful Fail is worse than doing one more insert in a transaction that's already open and locked, and there is no job queue yet.
- **A failed-step line index.** Rejected: harder to explain in the API, and readme §3 already models the failed step as text.
- **A co-member read policy on users** for reporter names. Rejected for now: a new RLS shape for one display field; member management will need its own policy design anyway.

## Consequences

- Auto-creation adds one conditional insert to Fail writes on executions that opt in. It runs under the lock the outcome write already holds.
- A bug filed by mistake against the wrong run must be deleted (by an Admin) and refiled until unlinking exists.
- A stored reporter name doesn't follow later renames; this is the same trade-off the activity log already makes.

## Revisit Triggers

- The automated execution engine returns with step results, making the failed step known without the reporter picking it (decision 4).
- Teams ask to move a bug between runs or link one bug to several runs (decision 5).
- Member management lands, which may justify a co-member read policy for display names (decision 6).
