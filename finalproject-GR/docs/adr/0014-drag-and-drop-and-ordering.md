# ADR 0014: Drag and Drop and Ordering Keys

**Status:** Accepted
**Date:** 2026-10-25
**Amends:** [ADR 0011](0011-frontend-ui-stack.md) (decides the drag-and-drop library it explicitly deferred; resolves the drag-and-drop part of open question F6)

## Context

[ADR 0011](0011-frontend-ui-stack.md) settled the frontend stack but deferred drag and drop to "when the phase that builds it starts". That phase is roadmap-mvp.md Phase 9: Slice 2 builds the Test Cases folder tree, where folders and test cases are reordered and moved by dragging (PRD §2.3, §6.2.5, §10.2). Slice 3 reuses the same mechanism for the New Execution "selected" panel and for reordering a Draft execution's runs (PRD §6.3.3). Readme §3 already modelled user-controlled order as a `position_key` "fractional index", but nothing chose how keys are generated.

## Decision

1. **dnd-kit** (`@dnd-kit/core`, `@dnd-kit/sortable`) for all drag and drop. It has pointer and keyboard sensors, sortable lists, and a modular core that a tree can sit on (flattened visible rows with a before/after/into drop zone).
2. **An accessible alternative for every drag.** Each tree item's actions menu has **Move to…** (a folder picker). Keyboard users can reorder with dnd-kit's keyboard sensor and nest with Move to….
3. **Fractional ordering keys, generated server-side by an in-house function.** Keys are strings over `0-9a-z`, read as base-36 fractions, and `keyBetween(a, b)` returns a key strictly between two neighbours (or before the first / after the last). Keys never end in `0`, so a key always exists between any two. Columns are `text COLLATE "C"`, so Postgres sorts byte-wise exactly as JavaScript compares strings. A move rewrites only the moved row.
4. **Clients send intent, not keys.** A move names its new parent and the sibling it goes after (or none for first); the server computes the key, under the row lock it already takes. Two concurrent moves into the same gap can produce equal keys; every ordering query breaks ties by `id`, and the next move into that gap separates them.
5. **Folders first.** Within a folder, subfolders are listed before test cases, each with its own key space. This is the file-tree convention, and it avoids one shared order across two tables.

## Alternatives Considered

- **The `fractional-indexing` npm package.** It's the usual implementation, but every release is ESM-only (`"type": "module"`). The API runs under CommonJS with ts-jest, which can't load it without ESM transform configuration. That's the same family of incompatibility that pinned NestJS to 11 (CLAUDE.md), for a function of about 40 lines. Revisit if the API moves to ESM.
- **Integer positions with renumbering.** Simple, but a move rewrites every later sibling and contends under concurrent edits.
- **Native HTML5 drag and drop.** No keyboard support, weak touch support, and inconsistent drop feedback across browsers.
- **react-beautiful-dnd / its forks.** List-oriented (no tree), and the original is unmaintained.

## Consequences

- One drag-and-drop stack for the tree and both Slice 3 surfaces; Slice 3 needs no further library decision.
- `position_key` columns must keep `COLLATE "C"`. A different collation would sort keys differently from the server's `keyBetween`.
- Keyboard nesting goes through Move to… rather than drag; acceptable and explicit.
- The still-open parts of F6 (traceability graph, chart library) are unaffected.
- *Note (2026-10-25, Slice 3):* decision 3's fractional keys apply to the folder tree only. `test_run` keeps its integer `position`: the Draft-only run move renumbers an execution's runs 1..n in one transaction (the `(execution_id, position)` unique is deferrable). Run lists are small, the execution row lock serializes moves, the table's `#` stays the stored position, and no migration is needed. Decision 4 still holds: the client sends the run it goes after, not a position.

## Revisit Triggers

- The API moves to ESM (consider the `fractional-indexing` package instead of the in-house function).
- Keys grow long under heavy repeated insertion into one gap. Rebalancing a parent's keys is then a local maintenance operation, not a schema change.
