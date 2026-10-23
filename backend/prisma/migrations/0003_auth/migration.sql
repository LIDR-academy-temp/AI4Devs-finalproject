-- Recon Tool 2.0 — auth-login (design D5, D6).
-- Generated with `prisma migrate diff` and adjusted by hand: SQL Server rejects ALTER COLUMN on a
-- column referenced by an index or a foreign key (error 5074), so AuditLog.userId's index and FK are
-- dropped and recreated with the same names around the nullability change.
BEGIN TRY

BEGIN TRAN;

-- AlterTable: AuditLog.userId becomes nullable (login attempts with an unknown userName)
ALTER TABLE [dbo].[AuditLog] DROP CONSTRAINT [AuditLog_userId_fkey];
DROP INDEX [AuditLog_userId_createdAt_idx] ON [dbo].[AuditLog];
ALTER TABLE [dbo].[AuditLog] ALTER COLUMN [userId] INT NULL;
CREATE NONCLUSTERED INDEX [AuditLog_userId_createdAt_idx] ON [dbo].[AuditLog]([userId] ASC, [createdAt] ASC);
ALTER TABLE [dbo].[AuditLog] ADD CONSTRAINT [AuditLog_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([userId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- CreateTable: issued refresh tokens, by jti
CREATE TABLE [dbo].[RefreshToken] (
    [tokenId] UNIQUEIDENTIFIER NOT NULL,
    [userId] INT NOT NULL,
    [expiresAt] DATETIME2 NOT NULL,
    [revokedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [RefreshToken_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [RefreshToken_pkey] PRIMARY KEY CLUSTERED ([tokenId])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RefreshToken_userId_revokedAt_idx] ON [dbo].[RefreshToken]([userId], [revokedAt]);

-- AddForeignKey
ALTER TABLE [dbo].[RefreshToken] ADD CONSTRAINT [RefreshToken_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([userId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
