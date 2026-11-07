-- Deployment only, after init.sql: schema changes move from recon_app to recon_migrator. Idempotent.
-- Variables: $(DB_NAME), $(RECON_MIGRATOR_PASSWORD) — injected by entrypoint.sh, or by hand on an external server.
IF NOT EXISTS (SELECT 1 FROM sys.sql_logins WHERE name = 'recon_migrator')
BEGIN
    CREATE LOGIN [recon_migrator] WITH PASSWORD = '$(RECON_MIGRATOR_PASSWORD)', CHECK_POLICY = ON, DEFAULT_DATABASE = [$(DB_NAME)];
END;
GO
USE [$(DB_NAME)];
GO
ALTER ROLE [db_ddladmin] DROP MEMBER [recon_app];
GO
-- recon_reader is local only (init.local.sql). Earlier deployments created it; remove it on the next start.
-- Never fails the init: a DROP LOGIN with an open session would keep mssql down. Retried on the next start.
BEGIN TRY
    IF DATABASE_PRINCIPAL_ID('recon_reader') IS NOT NULL DROP USER [recon_reader];
    IF EXISTS (SELECT 1 FROM sys.sql_logins WHERE name = 'recon_reader') DROP LOGIN [recon_reader];
END TRY
BEGIN CATCH
    PRINT 'recon_reader could not be removed: ' + ERROR_MESSAGE();
END CATCH;
GO
-- Last on purpose: the deployment healthcheck waits for this user.
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'recon_migrator')
BEGIN
    CREATE USER [recon_migrator] FOR LOGIN [recon_migrator] WITH DEFAULT_SCHEMA = [dbo];
END;
ALTER ROLE [db_datareader] ADD MEMBER [recon_migrator];
ALTER ROLE [db_datawriter] ADD MEMBER [recon_migrator];
ALTER ROLE [db_ddladmin] ADD MEMBER [recon_migrator];
GO
