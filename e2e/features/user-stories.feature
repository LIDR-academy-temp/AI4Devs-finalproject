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

  # HU1 to HU3: analyst processes and downloads; payments pays (README §2.5). The last steps leave nothing open.
  @timeout:300000
  Scenario: Happy path from the upload to the payment
    Given the database is freshly seeded for "batch-clean"
    And the analyst is signed in
    When they start a new reconciliation in "Merchant A" › "Provider A" › "ProviderA-USD"
    And they upload the files of "batch-clean"
    And they confirm the proposed mapping
    And they analyze the import
    Then they see the rows of "batch-clean"
    And they see the new channels of "batch-clean" in the channel notice
    When they run the validations
    Then the validations find what the oracle of "batch-clean" says
    And the validations used the date ranges of "batch-clean"
    When they continue to settlement review
    And they choose the settlement date "2026-10-24"
    Then Settlement Review proposes the batch number of "batch-clean"
    And the batch fees are the prefilled fees of "batch-clean"
    And the pre-summary shows the amount payable of "batch-clean"
    And the channels to assign are the new channels of "batch-clean"
    When they accept the channel assignment
    And they process the batch
    Then the settlement is "Processed · pending payment"
    And the new channels of "batch-clean" are no longer unassigned
    And the settlement summary shows the amount payable of "batch-clean"
    When they download the merchant summary of "batch-clean" with its amount payable
    Then the settlement is "Processed · pending payment"
    And they cannot mark it as paid
    When they sign out
    And the "payments" user is signed in
    And they open the settlement summary
    And they mark it as paid
    Then the settlement is "Paid"
    And it was paid by "payments"
    # Cleanup in sight: payments removes the payment, analyst undoes and cancels.
    When they unpay it with a reason
    Then the settlement is "Processed · pending payment"
    When they sign out
    And the "analyst" user is signed in
    And they open the settlement summary
    And they undo it with a reason
    Then the settlement is "Undone"
    When they go to Analysis & Validations
    And they cancel the import
    Then the import is "cancelled"

  # HU3 CA1 and CA8 with the two files of batch-split (HU1 CA1): the same number comes back as attempt 2.
  # Its validations are not compared with the oracle: that one is for batch 123 on a fresh seed, and here the happy
  # path has left 123 undone, so batch-split goes to the next number and, an undone attempt not counting as a previous
  # batch, finds its transactions missing previous to it. The happy path compares the validations.
  @timeout:300000
  Scenario: An undone batch is processed again with the same number
    Given the analyst is signed in
    When they start a new reconciliation in "Merchant A" › "Provider A" › "ProviderA-USD"
    And they upload the files of "batch-split"
    And they confirm the proposed mapping
    And they analyze the import
    Then they see the rows of "batch-split"
    When they run the validations
    And they continue to settlement review
    And they choose the settlement date "2026-10-24"
    And they process the batch, accepting any channel assignment it asks for
    Then the settlement summary shows the amount payable of "batch-split"
    When they undo it with a reason
    Then the settlement is "Undone"
    When they go to Analysis & Validations
    And they run the validations
    And they continue to settlement review
    And they choose the settlement date "2026-10-24"
    Then Settlement Review proposes the same batch number as attempt 2
    When they process the batch, accepting any channel assignment it asks for
    Then the settlement is attempt 2 of the same batch number
    And the settlement summary shows the amount payable of "batch-split"
    When they undo it with a reason
    Then the settlement is "Undone"
    When they go to Analysis & Validations
    And they cancel the import
    Then the import is "cancelled"

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
    And they see the wrong account notice of "batch-wrong-account"
    When they run the validations
    Then the validations find what the oracle of "batch-wrong-account" says
    And the decision of "batch-wrong-account" asks to confirm a batch with batch fees only
    And "Continue to settlement review" is disabled with "Confirm that this batch has batch fees only."
    When they cancel and reprocess
    Then the import is "cancelled"
    When they start a new import
    Then New Reconciliation has "ProviderA-USD" chosen
