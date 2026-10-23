-- settlement-process: the fee of an undated adjustment keeps the movement's NULL event date.
-- Hand-written and reviewed (never generated from schema.prisma).
BEGIN TRY

BEGIN TRAN;

-- An adjustment the source cannot date (0007) may still get a NULL…NULL fee of its type (gate decision P6b): its
-- detail row keeps the movement's NULL event date instead of an invented one.
ALTER TABLE [dbo].[SettlementTransactionFee] ALTER COLUMN [eventDate] DATETIME2 NULL;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
