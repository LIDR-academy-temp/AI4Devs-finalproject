-- Recon Tool 2.0 — rules that Prisma cannot express in schema.prisma (README §3.2).
-- Domain CHECKs, filtered unique indexes and the fee non-overlap trigger.
-- Hand-written and reviewed; kept separate from 0001_init so that a regeneration
-- of the base DDL does not overwrite it.

BEGIN TRY

BEGIN TRAN;

-- ───────── Domains (allowed values) ─────────

ALTER TABLE [dbo].[Gateway] ADD CONSTRAINT [CK_Gateway_idFormat]
    CHECK ([idFormat] IN ('numeric', 'uuid'));

ALTER TABLE [dbo].[Channel] ADD CONSTRAINT [CK_Channel_settlementTermDays] CHECK ([settlementTermDays] > 0);
ALTER TABLE [dbo].[Channel] ADD CONSTRAINT [CK_Channel_rollingReservePct] CHECK ([rollingReservePct] BETWEEN 0 AND 1);
ALTER TABLE [dbo].[Channel] ADD CONSTRAINT [CK_Channel_rollingReserveDays] CHECK ([rollingReserveDays] >= 0);

ALTER TABLE [dbo].[Account] ADD CONSTRAINT [CK_Account_chargebackReservePolicy]
    CHECK ([chargebackReservePolicy] IN ('hold_until_term', 'release_on_chargeback'));
ALTER TABLE [dbo].[Account] ADD CONSTRAINT [CK_Account_rollingReserveCapAmt]
    CHECK ([rollingReserveCapAmt] IS NULL OR [rollingReserveCapAmt] >= 0);

ALTER TABLE [dbo].[Cycle] ADD CONSTRAINT [CK_Cycle_cycle] CHECK ([cycle] IN ('E', 'I', 'R'));
ALTER TABLE [dbo].[TransactionStatus] ADD CONSTRAINT [CK_TransactionStatus_cycle] CHECK ([cycle] IN ('E', 'I'));

ALTER TABLE [dbo].[Fee] ADD CONSTRAINT [CK_Fee_amountOrPercentage]
    CHECK ([fixedAmount] IS NOT NULL OR [percentage] IS NOT NULL);
ALTER TABLE [dbo].[Fee] ADD CONSTRAINT [CK_Fee_validity]
    CHECK ([startDate] IS NULL OR [endDate] IS NULL OR [endDate] >= [startDate]);
ALTER TABLE [dbo].[Fee] ADD CONSTRAINT [CK_Fee_percentages]
    CHECK (([percentage] IS NULL OR [percentage] BETWEEN 0 AND 1)
       AND ([conditionalPercentage] IS NULL OR [conditionalPercentage] BETWEEN 0 AND 1)
       AND ([brandPercentage] IS NULL OR [brandPercentage] BETWEEN 0 AND 1));

ALTER TABLE [dbo].[FeeHistory] ADD CONSTRAINT [CK_FeeHistory_action]
    CHECK ([action] IN ('created', 'updated', 'closed', 'copied'));

ALTER TABLE [dbo].[MatchingSheetRule] ADD CONSTRAINT [CK_MatchingSheetRule_kind]
    CHECK ([kind] IN ('transactions', 'batch_fees', 'ignore'));
-- A transactions sheet carries a cycle; a batch-fees or ignored sheet does not.
ALTER TABLE [dbo].[MatchingSheetRule] ADD CONSTRAINT [CK_MatchingSheetRule_kindCycle]
    CHECK (([kind] = 'transactions' AND [cycle] IS NOT NULL)
        OR ([kind] <> 'transactions' AND [cycle] IS NULL AND [statusId] IS NULL));
-- Cycle R has no status.
ALTER TABLE [dbo].[MatchingSheetRule] ADD CONSTRAINT [CK_MatchingSheetRule_cycleR]
    CHECK ([cycle] IS NULL OR [cycle] <> 'R' OR [statusId] IS NULL);

ALTER TABLE [dbo].[MatchingColumnRule] ADD CONSTRAINT [CK_MatchingColumnRule_targetField]
    CHECK ([targetField] IN ('transactionId', 'status', 'gateway', 'amount', 'currency', 'txnDate', 'feeType', 'providerRef', 'orderId', 'reference'));

ALTER TABLE [dbo].[Transaction] ADD CONSTRAINT [CK_Transaction_currency] CHECK ([currency] = 'USD');
ALTER TABLE [dbo].[Transaction] ADD CONSTRAINT [CK_Transaction_appliedReservePct] CHECK ([appliedReservePct] BETWEEN 0 AND 1);
ALTER TABLE [dbo].[Transaction] ADD CONSTRAINT [CK_Transaction_amount] CHECK ([amount] >= 0);

ALTER TABLE [dbo].[Import] ADD CONSTRAINT [CK_Import_status]
    CHECK ([status] IN ('uploaded', 'mapped', 'analyzed', 'validated', 'processed', 'cancelled'));

ALTER TABLE [dbo].[ImportSheet] ADD CONSTRAINT [CK_ImportSheet_kind]
    CHECK ([kind] IN ('transactions', 'batch_fees', 'ignore'));
ALTER TABLE [dbo].[ImportSheet] ADD CONSTRAINT [CK_ImportSheet_cycle]
    CHECK ([cycle] IS NULL OR [cycle] IN ('E', 'I', 'R'));

ALTER TABLE [dbo].[ImportSheetColumnMap] ADD CONSTRAINT [CK_ImportSheetColumnMap_targetField]
    CHECK ([targetField] IN ('transactionId', 'status', 'gateway', 'amount', 'currency', 'txnDate', 'feeType', 'providerRef', 'orderId', 'reference'));

ALTER TABLE [dbo].[ImportRow] ADD CONSTRAINT [CK_ImportRow_matchResult]
    CHECK ([matchResult] IN ('matched', 'unmatched', 'ambiguous', 'ignored'));
ALTER TABLE [dbo].[ImportRow] ADD CONSTRAINT [CK_ImportRow_rawData_json] CHECK (ISJSON([rawData]) = 1);
ALTER TABLE [dbo].[ImportRow] ADD CONSTRAINT [CK_ImportRow_detailJson] CHECK ([detailJson] IS NULL OR ISJSON([detailJson]) = 1);

ALTER TABLE [dbo].[ValidationResult] ADD CONSTRAINT [CK_ValidationResult_validationCode]
    CHECK ([validationCode] IN ('provider_mismatch', 'non_recorded_adjustment', 'duplicate_in_batch', 'status_collision_in_batch',
                                 'duplicate_across_batches', 'status_collision_across_batches', 'missing_previous_to_batch', 'missing_in_range'));
ALTER TABLE [dbo].[ValidationResult] ADD CONSTRAINT [CK_ValidationResult_outcome]
    CHECK ([outcome] IN ('passed', 'failed', 'not_applicable', 'not_implemented'));

ALTER TABLE [dbo].[ValidationIssue] ADD CONSTRAINT [CK_ValidationIssue_issueType]
    CHECK ([issueType] IN ('provider_mismatch', 'non_recorded_adjustment', 'duplicate', 'collision', 'missing'));
ALTER TABLE [dbo].[ValidationIssue] ADD CONSTRAINT [CK_ValidationIssue_scope]
    CHECK ([scope] IS NULL OR [scope] IN ('in_batch', 'across_batches', 'previous_to_batch', 'in_range'));
ALTER TABLE [dbo].[ValidationIssue] ADD CONSTRAINT [CK_ValidationIssue_resolutionStatus]
    CHECK ([resolutionStatus] IN ('persistent', 'resolved'));
-- Only provider_mismatch is blocking.
ALTER TABLE [dbo].[ValidationIssue] ADD CONSTRAINT [CK_ValidationIssue_blocking]
    CHECK (([issueType] = 'provider_mismatch' AND [blocking] = 1) OR ([issueType] <> 'provider_mismatch' AND [blocking] = 0));

ALTER TABLE [dbo].[ConflictOccurrence] ADD CONSTRAINT [CK_ConflictOccurrence_sourceType]
    CHECK ([sourceType] IN ('current_import', 'previous_batch'));

ALTER TABLE [dbo].[SettlementBatch] ADD CONSTRAINT [CK_SettlementBatch_status]
    CHECK ([status] IN ('processed', 'paid', 'undone'));
ALTER TABLE [dbo].[SettlementBatch] ADD CONSTRAINT [CK_SettlementBatch_attemptNo] CHECK ([attemptNo] > 0);
ALTER TABLE [dbo].[SettlementBatch] ADD CONSTRAINT [CK_SettlementBatch_batchNo] CHECK ([batchNo] > 0);
-- A paid batch records who and when; an undone one does too.
ALTER TABLE [dbo].[SettlementBatch] ADD CONSTRAINT [CK_SettlementBatch_paidFields]
    CHECK ([status] <> 'paid' OR ([paidAt] IS NOT NULL AND [paidByUserId] IS NOT NULL));
ALTER TABLE [dbo].[SettlementBatch] ADD CONSTRAINT [CK_SettlementBatch_undoneFields]
    CHECK ([status] <> 'undone' OR ([undoneAt] IS NOT NULL AND [undoneByUserId] IS NOT NULL));

ALTER TABLE [dbo].[SettlementBatchFee] ADD CONSTRAINT [CK_SettlementBatchFee_source]
    CHECK ([source] IN ('file', 'manual'));

ALTER TABLE [dbo].[SettlementBatchTotal] ADD CONSTRAINT [CK_SettlementBatchTotal_category]
    CHECK ([category] IN ('deposit', 'declined', 'chargeback', 'refund', 'rdr'));

ALTER TABLE [dbo].[SettlementTransaction] ADD CONSTRAINT [CK_SettlementTransaction_roundNo]
    CHECK ([roundNo] IS NULL OR [roundNo] IN (1, 2));
ALTER TABLE [dbo].[SettlementTransaction] ADD CONSTRAINT [CK_SettlementTransaction_appliedReservePct]
    CHECK ([appliedReservePct] BETWEEN 0 AND 1);
ALTER TABLE [dbo].[SettlementTransaction] ADD CONSTRAINT [CK_SettlementTransaction_reserveAmts]
    CHECK ([reserveHeldAmt] >= 0 AND [reserveReleasedAmt] >= 0 AND [reserveEarlyReleasedAmt] >= 0);

ALTER TABLE [dbo].[User] ADD CONSTRAINT [CK_User_merchantScope] CHECK ([merchantScope] IN ('assigned', 'all'));

ALTER TABLE [dbo].[RolePermission] ADD CONSTRAINT [CK_RolePermission_permissionCode]
    CHECK ([permissionCode] IN ('settlement.process', 'payment.process', 'account.manage', 'fee.manage', 'fee.view', 'reports.view', 'user.manage'));

-- ───────── Filtered unique indexes ─────────

-- Only one primary account per channel.
CREATE UNIQUE NONCLUSTERED INDEX [UX_AccountChannel_primary]
    ON [dbo].[AccountChannel]([channelId]) WHERE [isPrimary] = 1;

-- Only one active (not undone) attempt per (account, official number) and per import.
CREATE UNIQUE NONCLUSTERED INDEX [UX_SettlementBatch_active_accountBatchNo]
    ON [dbo].[SettlementBatch]([accountId], [batchNo]) WHERE [status] <> 'undone';
CREATE UNIQUE NONCLUSTERED INDEX [UX_SettlementBatch_active_import]
    ON [dbo].[SettlementBatch]([importId]) WHERE [status] <> 'undone';

-- Only one global sheet rule per pattern (rule-set ones repeat per rule set).
CREATE UNIQUE NONCLUSTERED INDEX [UX_MatchingSheetRule_global_pattern]
    ON [dbo].[MatchingSheetRule]([sheetPattern]) WHERE [ruleSetId] IS NULL;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

-- ───────── Trigger: no overlap of fee validity periods ─────────
-- Two fees with the same (accountId, feeTypeId) cannot intersect; NULL = −∞ / +∞.
-- Backstop for the use case (which already validates this with a per-account lock); kept here
-- so that no direct write can leave the table inconsistent.
-- Prisma runs the file as a single batch (no GO), which is why the trigger goes inside EXEC.

EXEC(N'
CREATE OR ALTER TRIGGER [dbo].[TR_Fee_NoOverlap]
ON [dbo].[Fee]
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1
          FROM inserted AS i
          JOIN [dbo].[Fee] AS f
            ON f.[accountId] = i.[accountId]
           AND f.[feeTypeId] = i.[feeTypeId]
           AND f.[feeId] <> i.[feeId]
         WHERE COALESCE(i.[startDate], ''0001-01-01'') <= COALESCE(f.[endDate], ''9999-12-31'')
           AND COALESCE(f.[startDate], ''0001-01-01'') <= COALESCE(i.[endDate], ''9999-12-31'')
    )
    BEGIN
        THROW 50001, ''Fee validity overlaps an existing fee of the same type for this account.'', 1;
    END;
END;
');
