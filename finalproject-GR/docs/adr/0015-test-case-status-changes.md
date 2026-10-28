# ADR 0015: Test Case Status Changes

**Status:** Accepted
**Date:** 2026-10-26
**Resolves:** open question G2

## Context

[PRD.md](../../PRD.md) §6.2.3 shows a test case's status (Draft, Ready, Deprecated), but doesn't say how it changes or who may change it (open question G2). The MVP built a status selector in the test case detail anyway (`test-case-authoring`: "A Contributor or above can update a test case's name, script, and status"), and [ADR 0012](0012-execution-completion-and-sign-off.md) made status matter: only Ready test cases can be selected into an execution, re-checked at Mark as Ready. The behaviour was never recorded as a decision, and the API doesn't activity-log test case edits at all.

## Decision

1. **Any status may change to any other.** Draft, Ready and Deprecated form no state machine; Deprecated is not final.
2. **Contributors and Admins** may change status (same as editing the name or script); Viewers may not.
3. **Status gates execution selection only** (ADR 0012): a test case that leaves Ready stays in the executions that already contain it; Mark as Ready re-checks it.
4. **Every status change is activity-logged** with the old and new value, in the same transaction (ADR 0007). The API does not do this yet; the first change that touches the test case update path adds it (planned: Phase 4 remainder, tags slice).

## Alternatives Considered

- **Deprecated as a final state.** Prevents accidental re-use, but un-deprecating then needs a copy. Teams revive old scenarios often enough that this would only add friction.
- **Only Admins may deprecate.** Matches "deprecate is almost a delete", but deprecation is reversible and deletion already has its own Admin gate.

## Consequences

- No API or UI change beyond the missing activity entry.
- Dashboards (full roadmap Phase 9) that count "Ready" test cases read the current status; no history of status changes exists before logging is added.

## Revisit Triggers

- Teams ask for review workflows (e.g. Draft → In Review → Ready with an approver).
