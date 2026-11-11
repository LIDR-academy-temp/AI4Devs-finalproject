# Smoke of HU1 against the real app and API with the seed loaded (openspec/specs/import, "Smoke E2E de la importación").
# The expected counts are those of data/samples/batch-clean/expected.json.
Feature: Import smoke

  Scenario: A clean batch end to end
    Given the analyst is signed in
    When they start a new reconciliation in "Merchant A" › "Provider A" › "ProviderA-USD"
    And they upload "data/samples/batch-clean/Recon_Template_ProviderA-USD_batch-clean.xlsx"
    And they confirm the proposed mapping
    And they analyze the import
    Then they see 783 rows read and 780 matched
    And they see the channel notice "RAM-07 is not assigned yet"
    When they cancel the import
    Then the import is "cancelled"
