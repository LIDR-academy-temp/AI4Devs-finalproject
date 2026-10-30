/*
  PROD-ADMIN-001 — Validacion post-despliegue (prod o TEST).
  Ejecutar en la BD que usa la API.

  -- [OK] TESTS [prod db24572 2026-10-30] -> 4 PASS / 0 ROJO (MCP + smoke manual)
*/
SET NOCOUNT ON;

DECLARE @fail int = 0;

IF OBJECT_ID(N'wms.Articulos', N'U') IS NULL SET @fail = @fail + 1;
IF COL_LENGTH(N'arc.vsArchivos', N'FechaCreacion') IS NULL SET @fail = @fail + 1;
IF OBJECT_ID(N'sgr.RefreshTokens', N'U') IS NULL SET @fail = @fail + 1;

BEGIN TRY
    EXEC(N'SELECT TOP 1 1 FROM usr.vsMascotas WITH (NOLOCK)');
END TRY
BEGIN CATCH
    SET @fail = @fail + 1;
END CATCH;

IF @fail > 0
BEGIN
    RAISERROR(N'PROD-ADMIN-001: validacion BD fallo (%d checks)', 16, 1, @fail);
    RETURN;
END

PRINT N'PROD-ADMIN-001: validacion BD OK';
