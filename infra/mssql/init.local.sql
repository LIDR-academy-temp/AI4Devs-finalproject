-- Local development only, after init.sql: mounted by infra/docker-compose.yml, never by the deployment. Idempotent.
-- Read-only user for agents and query tools (DB MCP in --readonly). The deployment removes it (init.deploy.sql).
-- Variables: $(DB_NAME), $(RECON_APP_PASSWORD) — injected by entrypoint.sh from .env.
IF NOT EXISTS (SELECT 1 FROM sys.sql_logins WHERE name = 'recon_reader')
BEGIN
    CREATE LOGIN [recon_reader] WITH PASSWORD = '$(RECON_APP_PASSWORD)', CHECK_POLICY = ON, DEFAULT_DATABASE = [$(DB_NAME)];
END;
GO
USE [$(DB_NAME)];
GO
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'recon_reader')
BEGIN
    CREATE USER [recon_reader] FOR LOGIN [recon_reader] WITH DEFAULT_SCHEMA = [dbo];
    ALTER ROLE [db_datareader] ADD MEMBER [recon_reader];
END;
GO
