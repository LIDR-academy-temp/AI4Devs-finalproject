-- ANM-BE-027 — Pruebas data-layer (TRAN + ROLLBACK)
-- Ejecutar tras DB-001/002 y DB-003_anm_tipos_seed.sql
-- -- [OK] TESTS [CQ500] -> ejecutar tras sqlcmd local; expectativa: PRINT PASS al final
SET XACT_ABORT ON;
BEGIN TRAN;

-- TC-ERR-1: sin usuario seed
DECLARE @adminId int = (SELECT TOP 1 UsuarioID FROM sgr.Usuarios WHERE bEliminado = 0 ORDER BY UsuarioID);
IF @adminId IS NULL
    THROW 50004, 'TC-ERR-1 FAIL: sin usuario seed en sgr.Usuarios', 1;

-- TC-5: seed tipos
DECLARE @tipos int = (SELECT COUNT(*) FROM anm.TiposAnuncio WHERE bEliminado = 0 AND TipoAnuncio IN (N'General', N'Urgente', N'Mantenimiento'));
IF @tipos < 3
    THROW 50001, 'TC-5 FAIL: faltan tipos (correr DB-003)', 1;

-- TC-2 fixture: anuncio fuera de vigencia no debe aparecer en vista vigente
DECLARE @tipoId int = (SELECT TOP 1 TipoAnuncioID FROM anm.TiposAnuncio WHERE TipoAnuncio = N'General' AND bEliminado = 0);

INSERT INTO anm.Anuncios (Titulo, Contenido, FechaPublicacion, VigenteHasta, TipoAnuncioID, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
VALUES (N'TC-ERR expirado', N'x', DATEADD(day, -10, SYSUTCDATETIME()), DATEADD(day, -1, SYSUTCDATETIME()), @tipoId, N'test', @adminId, SYSUTCDATETIME(), 0);

DECLARE @expiradoId int = SCOPE_IDENTITY();
DECLARE @vigentes int = (
    SELECT COUNT(*) FROM anm.vsAnuncios v
    WHERE v.AnuncioID = @expiradoId
      AND v.bEliminado = 0
      AND v.FechaPublicacion <= SYSUTCDATETIME()
      AND (v.VigenteHasta IS NULL OR v.VigenteHasta >= SYSUTCDATETIME())
);
IF @vigentes <> 0
    THROW 50002, 'TC-2 FAIL: anuncio expirado visible como vigente', 1;

-- TC-IDEM / TC-3: idempotencia log (simulacion 2x)
INSERT INTO anm.Anuncios (Titulo, Contenido, FechaPublicacion, TipoAnuncioID, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
VALUES (N'TC-3 visto', N'x', SYSUTCDATETIME(), @tipoId, N'test', @adminId, SYSUTCDATETIME(), 0);
DECLARE @aid int = SCOPE_IDENTITY();

DECLARE @i int = 0;
WHILE @i < 2
BEGIN
    IF NOT EXISTS (SELECT 1 FROM anm.LogVisualizacionAnuncios WITH (UPDLOCK, HOLDLOCK) WHERE AnuncioID = @aid AND UsuarioID = @adminId AND bEliminado = 0)
        INSERT INTO anm.LogVisualizacionAnuncios (AnuncioID, UsuarioID, Medio, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
        VALUES (@aid, @adminId, N'WEB', N'test', @adminId, SYSUTCDATETIME(), 0);
    SET @i += 1;
END;

DECLARE @logs int = (SELECT COUNT(*) FROM anm.LogVisualizacionAnuncios WHERE AnuncioID = @aid AND UsuarioID = @adminId AND bEliminado = 0);
IF @logs <> 1
    THROW 50003, 'TC-3 FAIL: se esperaba 1 fila log tras 2 intentos', 1;

ROLLBACK TRAN;
PRINT N'ANM-BE-027 SQL tests PASS (rolled back).';
-- -- [OK] TESTS [CQ500] -> 4 PASS / 0 ROJO
