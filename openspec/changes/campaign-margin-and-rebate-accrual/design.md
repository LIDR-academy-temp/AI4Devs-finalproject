## Context

See `proposal.md` — Why. This is the change the product exists for: the margin calculation *is* the product, and every other change feeds it. It is also the one where a wrong number is invisible until someone reconciles a year of data, which is why `docs/backend-standards.md` requires the economic model to live in a domain layer with no infrastructure dependencies.

Three facts shape the design. The rebate is a **tiered annual accrual attributed chronologically**, so a campaign's rate depends on everything accrued before it. A **schedule change restates the whole year**. And a **backdated correction cascades** into every later campaign of that counter. All three mean the engine must be able to replay a counter-year from scratch, deterministically.

## Goals / Non-Goals

**Goals**

- The whole economic model unit-testable with no database, no HTTP server and no DSP.
- A counter-year replay that is deterministic and cheap enough to run on demand.
- Every calculated figure traceable to the rate that produced it and the reason that rate applied.

**Non-Goals**

- Immutable month-end snapshots and a Finance-facing rate editor — phase 2.
- Performance work on delivery aggregation; that is owned by the delivery change.

## Decisions

**The bracket engine replays a whole counter-year rather than applying an increment.** Chronological attribution means campaign N's rate depends on the cumulative position after campaigns 1..N-1, so any insert, revision or removal earlier in the year invalidates everything after it. An incremental accrual would need compensating adjustments for every one of those events; a replay needs none. With 112 group/channel/year combinations and 2,884 historical campaign-months, a year's replay is a few thousand rows — small enough that correctness beats cleverness.

**Ordering within a month is sequential by date, then by a stable tiebreak.** Marginal brackets are order-invariant in aggregate, so any roll-up is unaffected by the sequence; only an individual campaign's rate moves, and only for the 1.2% of campaign-months that straddle a threshold. A stable tiebreak makes the replay reproducible, which matters more than which campaign gets the cheaper slice.

**`applied_rates` is written once per calculation and never updated in place.** A recalculation writes a new row; the previous one stays. This is what makes a restatement visible rather than silent, and it is the difference between a margin history and a number that quietly changed.

**The resolution ladder is data-driven, not a chain of conditionals.** The eight steps are a table of progressively wider match keys, walked in order. Adding the agency-exception steps was adding rows to that table, which is the evidence the shape is right — a conditional chain would have needed restructuring.

**A missing schedule resolves to an explicit zero, written to the line with its reason.** Never a null, and never an error. A group negotiated at zero and a group whose rate was never loaded produce the same number but different provenance, and Finance must be able to tell them apart.

**The margin is computed on demand from stored inputs, not stored as a row.** Its terms — contracted volume, delivered volume, frozen rates — are all persisted; the margin itself is a function of them. Storing it would create a second source of truth for the exact number this product exists to make reliable. The phase-2 month-end snapshot is a deliberate exception, and is explicitly a snapshot rather than the live figure.

**`CuratorMargin` is computed, never ingested.** Verified as `OC revenue − purchase cost` on 404 of 408 rows of the supplied reports. It is a billing obligation towards Equativ, reported and reconciled, and it never enters the margin. Its own `% Margin` excludes the platform cost, so the Equativ-facing figure and the internal one are two different numbers by construction and must never be presented as the same.

## Risks / Trade-offs

- **Margins will appear to fall by roughly 16 points the day the new figures are published**, and Deal revenue will more than quadruple, both by design. → This is a communications risk before it is a technical one. The reconciliation output attributes every difference to a named defect, and that has to be socialised with Finance and Business *before* they see the numbers.
- **The bracket thresholds are not yet known.** → Historical rates migrate as a single bracket covering all volume, which reproduces today's flat behaviour exactly. Supplying real brackets later is data entry plus a replay, not a code change.
- **A replay triggered by a backdated correction could cascade widely** across a large agency-year. → Bounded by counter and year, and the counter is already the natural unit of work. Measured against the largest real combination — 1,159,752 € in one group and channel — before the schedule is enabled.
- **Chronological attribution makes two comparable campaigns in a crossing month carry different rates.** → Real, bounded to 1.2% of campaign-months, and documented so a campaign-level comparison inside a crossing month is read as an artefact of the method rather than a performance difference.
- **Replay determinism could drift** if any input is read at calculation time instead of being frozen. → The frozen `applied_rates` row is the guard, and a test asserts that editing a master after calculation does not move the figure.

## Migration Plan

1. Alembic migration creates `rebate_schedules`, `rebate_brackets`, `rebate_accruals`, `platform_rate_settings` and `applied_rates`.
2. The three rebate spreadsheets normalise into `rebate_schedules` with `valid_from` / `valid_to`, each rate as a single open bracket. 2025 inherits 2024 by the ladder rather than by a hardcoded label.
3. The platform rate is seeded at the system default of 1.00 €/CPM, recorded as data rather than assumed.
4. A set of closed months is recalculated and reconciled line by line against Qlik Sense; every difference is classified before the figures are published.
5. Rollback drops the five tables; the campaign and delivery data they read are untouched.

## Open Questions

- Whether a settled rebate should be recorded per payment or as a single annual figure per counter. It affects the settlement view only, not the accrual engine or the margin, and can be decided when the first year is actually settled.
