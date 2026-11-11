-- review-inclusion-version: version of the inclusions of a run, required by the review (#53, design D1-D3).
-- Hand-written and reviewed (never generated from schema.prisma).
BEGIN TRY

BEGIN TRAN;

-- Starts at 0 and goes up by 1 with every applied inclusion change of the run, in the same transaction as the change.
-- Existing runs start at 0: the version only has to differ from the one the review read, not count the history.
ALTER TABLE [dbo].[ValidationRun] ADD
    [inclusionVersion] INT NOT NULL CONSTRAINT [ValidationRun_inclusionVersion_df] DEFAULT 0
        CONSTRAINT [CK_ValidationRun_inclusionVersion] CHECK ([inclusionVersion] >= 0);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
