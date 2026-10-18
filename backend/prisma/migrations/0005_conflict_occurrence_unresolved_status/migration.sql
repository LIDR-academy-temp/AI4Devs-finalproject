-- An occurrence whose row status could not be resolved still collides (validation-engine): its statusId is NULL.
-- SQL Server does not allow ALTER COLUMN on a column with a foreign key: drop it and recreate it with the same name.
BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[ConflictOccurrence] DROP CONSTRAINT [ConflictOccurrence_statusId_fkey];

ALTER TABLE [dbo].[ConflictOccurrence] ALTER COLUMN [statusId] INT NULL;

ALTER TABLE [dbo].[ConflictOccurrence] ADD CONSTRAINT [ConflictOccurrence_statusId_fkey] FOREIGN KEY ([statusId])
    REFERENCES [dbo].[TransactionStatus]([statusId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
