-- DB-003 — Seed catálogo anm.TiposAnuncio (idempotente)
-- Ejecutar: sqlcmd -S localhost -E -d CuartaQuinientos -i SQL/DB-003_anm_tipos_seed.sql
SET NOCOUNT ON;

DECLARE @AdminId int = (SELECT TOP 1 UsuarioID FROM sgr.Usuarios WHERE bEliminado = 0 ORDER BY UsuarioID);
IF @AdminId IS NULL SET @AdminId = 1;

MERGE anm.TiposAnuncio AS t
USING (VALUES
    (N'General'),
    (N'Urgente'),
    (N'Mantenimiento')
) AS s(TipoAnuncio) ON t.TipoAnuncio = s.TipoAnuncio
WHEN NOT MATCHED BY TARGET THEN
    INSERT (TipoAnuncio, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
    VALUES (s.TipoAnuncio, N'DB-003', @AdminId, SYSUTCDATETIME(), 0);

PRINT N'DB-003: tipos anuncio listos.';
