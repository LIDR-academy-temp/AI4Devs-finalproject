## Why

Today a campaign is registered by transcribing the client's purchase order into `campaigns.xlsx` on OneDrive by hand. The file has no referential integrity: the agency is free text that fails to resolve for 167 of 2,921 historical rows worth 324,428 €, the DSP sits in a column called `trading` while the column named `DSP` is empty in 162 of 170 rows, and the link to delivery is a campaign name parsed positionally out of a delimited string. A typo in any of them silently removes a campaign from revenue.

This change creates the campaign as a real record with validated references, so that everything downstream — delivery ingestion, pacing, margin — has something reliable to join to. It is the entry point of the product: nothing else can be built before a campaign exists.

**Phase 1** per `docs/product-description.md` §6.

## What Changes

- Campaigns are registered against **validated master references** (agency, advertiser, DSP, channel, format, campaign type, sector, sales rep) rather than typed strings. A value that does not resolve is rejected, and nothing is auto-created.
- A campaign registration **expands automatically into monthly periods**, one per calendar month between its start and end dates, clipped to those dates. The monthly period is a first-class entity because it is the grain the business commits budget and reports on.
- Contracted volume and sale CPM live **on the campaign line**, not on the campaign header, because the CPM already varies between lines of the same campaign (21 distinct values observed, from 2 € to 31.25 €).
- The purchase order becomes a **versioned entity**. Registration creates version 1; a later revision creates a new version rather than overwriting, since revenue, rebate base and bracket accumulation all read the version in force.
- The `location` free-text field is **split in two**: a validated `scope` (`national` / `international`) that prices the rebate, and a descriptive `market_description` that does not. The current field holds 80 distinct values of which 2% classify into neither bucket.
- Each campaign line carries a **DSP mapping validated against the Adform API at save time**. An active line with no mapping is a **blocking** status, not a warning.
- `OF` and `OC` references are captured as first-class fields, both **optional**: only 47% and 38% of current rows carry them.

## Capabilities

### New Capabilities

- `campaign/campaign-registration`: registering a campaign from a purchase order, expanding it into monthly periods and lines, with validated master references and explicit scope.
- `campaign/purchase-order`: purchase orders and their immutable versions, carrying the contracted volume and sale CPM in force.
- `campaign/dsp-mapping`: the external campaign and line-item identifiers that bind a campaign line to a DSP, validated on save, blocking when absent.
- `masters/commercial-masters`: the holding group, agency, advertiser, DSP, channel, format, campaign type, sector and sales-rep catalogues that registration validates against.

### Modified Capabilities

<!-- None. This is the first change in the project; no specs exist yet. -->

## Impact

- **Database**: first schema of the project. Creates the master tables, the campaign tree (`campaigns`, `campaign_periods`, `campaign_lines`), the purchase-order tables and `dsp_mappings`, plus the `users` / `roles` / `user_roles` identity tables that authorisation depends on. All via Alembic.
- **Backend**: domain entities and repository interfaces for the campaign tree; application service for registration; FastAPI routers under `/campaigns`, `/purchase-orders` and the master endpoints; an Adform client in `infrastructure/dsp/` used only to validate an external id.
- **Frontend**: the registration form and the master pickers, guarded by the `operations` role.
- **External**: Adform API, read-only, for id validation. AWS Cognito for authentication.
- **Migration**: seeds the master tables by importing `campaigns.xlsx` and `extraprimas 2026.xlsx`. The 22 unresolved agency values are reconciled by Operations **before** the historical corpus loads — this is a prerequisite, not a follow-up.

## Non-goals

- **Commercial offer management and `OF` → `OC` conversion.** Phase 3. `purchase_orders.commercial_offer_id` is modelled nullable from the start so adding it later is not a migration.
- **Creating or trafficking campaigns in the DSP.** Excluded by the PO: AdOps360 reads from the DSPs and never writes to them.
- **Delivery ingestion, pacing and margin.** Covered by `daily-campaign-delivery-status` and `campaign-margin-and-rebate-accrual`.
- **Historical corpus load.** The schema and the master seed land here; importing the 2,921 historical campaign-months is separate work.
- **Equativ and Displayce id validation.** Phase 2; the mapping table is DSP-agnostic but only the Adform validator is built.
