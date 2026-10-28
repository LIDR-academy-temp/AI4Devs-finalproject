-- DB-004 — Seed catálogo enc.TiposPregunta (idempotente)
-- Ejecutar: sqlcmd -S localhost -E -d CuartaQuinientos -i SQL/DB-004_enc_seed.sql
SET NOCOUNT ON;

DECLARE @AdminId int = (SELECT TOP 1 UsuarioID FROM sgr.Usuarios WHERE bEliminado = 0 ORDER BY UsuarioID);
IF @AdminId IS NULL SET @AdminId = 1;

MERGE enc.TiposPregunta AS t
USING (VALUES
    (N'Opción múltiple'),
    (N'Texto libre')
) AS s(TipoPregunta) ON t.TipoPregunta = s.TipoPregunta
WHEN NOT MATCHED BY TARGET THEN
    INSERT (TipoPregunta, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
    VALUES (s.TipoPregunta, N'DB-004', @AdminId, SYSUTCDATETIME(), 0);

PRINT N'DB-004: tipos pregunta listos.';
