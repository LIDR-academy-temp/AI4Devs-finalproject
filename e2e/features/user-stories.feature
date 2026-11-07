# The user stories HU1 to HU3 in the browser, against the real app and API (openspec/specs/e2e, README §2.6).
#
# Every figure comes from data/samples/<sample>/expected.json: the steps name the sample, never a number.
#
# Needs a freshly seeded database (`pnpm db:seed`), as CI has: processing batch-clean makes RAM-07 the primary channel
# of ProviderA-USD for good (undo does not revert it) and uses up batch numbers. The happy path checks it first and
# fails with "Run pnpm db:seed first".
#
# Depends on `workers: 1` and on the alphabetical order of the feature files: import-smoke.feature runs before this
# file (it expects RAM-07 not assigned yet), and inside it the scenarios run in order, the happy path first.
#
# A green run leaves, until the next seed: two batch numbers of ProviderA-USD used up, with their attempts undone;
# the imports it created cancelled; RAM-07 primary in ProviderA-USD; and the audit of every action. Nothing stays
# processed nor paid. A scenario that fails half way is cleaned up through the API (steps/fixtures.ts).
Feature: User stories

  Scenario: provider_mismatch blocks the batch and the import is cancelled
    Given the analyst is signed in
    When they start a new reconciliation in "Merchant A" › "Provider B" › "ProviderB-Main"
    And they upload the files of "batch-blocked"
    And they confirm the proposed mapping
    And they analyze the import
    Then they see the rows of "batch-blocked"
    When they run the validations
    Then the validations find what the oracle of "batch-blocked" says
    And the findings of "Provider mismatch" list the affected IDs of "batch-blocked"
    And "Continue to settlement review" is disabled with "provider_mismatch: cancel the import and process it under the correct provider."
    When they cancel and reprocess
    Then the import is "cancelled"

  Scenario: A batch without matched rows is cancelled and reprocessed
    Given the analyst is signed in
    When they start a new reconciliation in "Merchant A" › "Provider A" › "ProviderA-USD"
    And they upload the files of "batch-wrong-account"
    And they confirm the proposed mapping
    And they analyze the import
    Then they see the rows of "batch-wrong-account"
    And they see the unmatched rows by reason of "batch-wrong-account"
    And they see the wrong account notice
    When they run the validations
    Then the validations find what the oracle of "batch-wrong-account" says
    And the decision asks to confirm a batch with batch fees only
    And "Continue to settlement review" is disabled with "Confirm that this batch has batch fees only."
    When they cancel and reprocess
    Then the import is "cancelled"
    When they start a new import
    Then New Reconciliation has "ProviderA-USD" chosen
