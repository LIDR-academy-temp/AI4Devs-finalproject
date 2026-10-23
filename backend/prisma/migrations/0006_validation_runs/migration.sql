-- validation-runs: informative counters of a run, one current run per import, sheet position in its workbook.
BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[ValidationRun] ADD
    [undatedAdjustmentCount] INT NOT NULL CONSTRAINT [ValidationRun_undatedAdjustmentCount_df] DEFAULT 0,
    [undatedCandidateCount] INT NOT NULL CONSTRAINT [ValidationRun_undatedCandidateCount_df] DEFAULT 0;

-- Position of the sheet in its workbook (0 = first); NULL for imports uploaded before this migration.
ALTER TABLE [dbo].[ImportSheet] ADD [sheetIndex] INT NULL CONSTRAINT [CK_ImportSheet_sheetIndex] CHECK ([sheetIndex] >= 0);

-- Only one current (not superseded) run per import.
CREATE UNIQUE NONCLUSTERED INDEX [UX_ValidationRun_current_import]
    ON [dbo].[ValidationRun]([importId]) WHERE [isSuperseded] = 0;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
