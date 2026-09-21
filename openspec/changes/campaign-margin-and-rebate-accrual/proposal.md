## Why

The margin logic lives inside chart expressions in a Qlik Sense application, keyed on a parsed campaign-name string, with the rebate year chosen by a hardcoded two-way `if`. Nothing records what the rule was supposed to be, which is why the app computes the platform cost on its own sheet and then leaves it out of the margin — overstating the figure Finance reads by **16.0 points across 2023–2026**, or 1,906,045 € of cost that never reaches the headline number.

The rebate is worse: it is stored as one flat percentage per key in a spreadsheet whose key schema widens every year and whose mid-year changes are recorded by inventing a new row and writing the reason in a free-text comment. The tiered accrual the business actually negotiates does not exist anywhere in the tooling.

This change makes the calculation explicit, tested and versioned.

**Phase 1** per `docs/product-description.md` §6.

## What Changes

- **The margin is computed from explicit rules**: revenue on contracted volume, less media cost, less agency rebate, **less platform cost**. The platform cost is part of the margin, which is the point on which this product's numbers will differ most visibly from the ones Finance reads today.
- **Revenue is recognised on contracted volume, never on delivered.** Delivered volume drives the platform cost and nothing else.
- **A running month is pro-rated by elapsed contract days** and presented as an accrual, explicitly labelled, not as a result.
- **The rebate becomes a bracket schedule with marginal tiers**, resolved by date through an eight-step ladder, accumulating per counter and channel over the year and attributed chronologically.
- **An agency may carry an exception** that overrides its group's schedule and **carves it out of the group's counter** for that channel.
- **Applied rebate and platform rates are frozen on the campaign line** at calculation time, with the resolution step, the source year and whether the rate came from an agency exception. Editing a master afterwards does not move a calculated margin.
- **The platform rate becomes data**, configurable at system, agency-or-campaign-type and line level, every override stamped with its author and time. Today it is a hardcoded `1` in a chart expression.
- **Accrued and settled are held separately**, because the rebate accrues per campaign and is paid once a year in arrears.
- **Roll-ups by period, agency, advertiser and campaign type**, with Excel and CSV export, restricted to the `finance` role.

## Capabilities

### New Capabilities

- `finance/margin-calculation`: the per-line and per-campaign economics — revenue, media cost, rebate, platform cost and margin — in both closed-month and running-month form.
- `finance/rebate-schedule`: bracket schedules with temporal validity, the resolution ladder, and the agency exception that overrides a group's schedule.
- `finance/rebate-accrual`: annual accumulation per counter and channel, chronological bracket attribution, and the accrued-versus-settled distinction.
- `finance/platform-rate`: the infrastructure rate as configurable, audited data resolved most-specific-first.
- `finance/margin-reporting`: roll-ups, export, and the provisional labelling that keeps an estimate from being read as a result.

### Modified Capabilities

<!-- None. The capabilities this change builds on are introduced by
     register-campaign-from-purchase-order and daily-campaign-delivery-status,
     neither of which is archived, so neither exists under openspec/specs/ to carry a delta. -->

### Dependencies

- `register-campaign-from-purchase-order`: supplies contracted volume, sale CPM, channel, scope and the agency-to-group chain.
- `daily-campaign-delivery-status`: supplies delivered impressions and media cost.

## Impact

- **Database**: `rebate_schedules` with temporal validity and a nullable agency for exceptions, `rebate_brackets`, `rebate_accruals` keyed on group, optional agency, channel and year, `platform_rate_settings`, and `applied_rates` frozen per line.
- **Backend**: the whole economic model in the domain layer, testable without a database; the resolution ladder; the chronological bracket engine with full agency-year replay; roll-up queries aggregated in the database; `finance`-only routers.
- **Frontend**: margin and roll-up views restricted to `finance`, with provisional figures labelled and loss-making lines flagged.
- **Migration**: the three rebate spreadsheets normalise into one table with `valid_from` / `valid_to`; each historical rate loads as a single bracket covering all volume, since none of the files carries bracket columns.

## Non-goals

- **The bracket thresholds themselves.** The ladder is built; the negotiated values are pending and load as single brackets until supplied.
- **Immutable month-end snapshots and a rate-versioning interface for Finance.** Phase 2.
- **Retiring Qlik Sense.** Phase 4. This runs alongside it, and acceptance is explained divergence, not parity.
- **Invoicing, ERP posting and credit notes.** Excluded by the PO.
- **Multi-currency.** Everything is EUR; amounts carry an explicit currency so adding conversion later is not a migration.
- **`CuratorMargin` as stored data.** It is `OC revenue − purchase cost`, computed on demand for Equativ billing, and never enters the margin.
