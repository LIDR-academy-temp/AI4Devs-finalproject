-- Validation outcome vocabulary: failed is replaced by warning and blocked (validation-engine).
-- No ValidationResult rows exist yet; a row with 'failed' would make the ADD CONSTRAINT fail visibly.
ALTER TABLE [dbo].[ValidationResult] DROP CONSTRAINT [CK_ValidationResult_outcome];
ALTER TABLE [dbo].[ValidationResult] ADD CONSTRAINT [CK_ValidationResult_outcome]
    CHECK ([outcome] IN ('passed', 'warning', 'blocked', 'not_applicable', 'not_implemented'));

-- status_mismatch: E row whose reported status contradicts the gateway (Declined vs Successful).
-- CK_ValidationIssue_blocking is unchanged: it already keeps every type but provider_mismatch non-blocking.
ALTER TABLE [dbo].[ValidationIssue] DROP CONSTRAINT [CK_ValidationIssue_issueType];
ALTER TABLE [dbo].[ValidationIssue] ADD CONSTRAINT [CK_ValidationIssue_issueType]
    CHECK ([issueType] IN ('provider_mismatch', 'non_recorded_adjustment', 'status_mismatch', 'duplicate', 'collision', 'missing'));
