-- settlement-process: one movement per source row of a batch, and an event date that may be unknown.
-- Hand-written and reviewed (never generated from schema.prisma: the filtered index and the CHECK live only here).
BEGIN TRY

BEGIN TRAN;

-- A batch may hold several movements of the same transaction and cycle (Refund + Chargeback, Chargeback + CHB 2,
-- a duplicate included by hand): the old key (transactionId, cycle, batchId) goes. Lookups by (transactionId, cycle)
-- keep the non-unique index SettlementTransaction_transactionId_cycle_idx.
ALTER TABLE [dbo].[SettlementTransaction] DROP CONSTRAINT [SettlementTransaction_transactionId_cycle_batchId_key];

-- The sheet and the row of origin go together: both set (a processed import row) or both NULL (seeded history).
ALTER TABLE [dbo].[SettlementTransaction] ADD CONSTRAINT [CK_SettlementTransaction_sourceRow]
    CHECK (([sheetId] IS NULL AND [rowNo] IS NULL) OR ([sheetId] IS NOT NULL AND [rowNo] IS NOT NULL));

-- One movement per source row of a batch. Filtered: SQL Server treats NULLs as equal in a unique index, and the
-- seeded movements have no row.
CREATE UNIQUE NONCLUSTERED INDEX [UX_SettlementTransaction_batch_row]
    ON [dbo].[SettlementTransaction]([batchId], [sheetId], [rowNo]) WHERE [sheetId] IS NOT NULL;

-- An adjustment the source cannot date keeps a NULL event date instead of an invented one (HU3 CA3).
ALTER TABLE [dbo].[SettlementTransaction] ALTER COLUMN [eventDate] DATETIME2 NULL;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
