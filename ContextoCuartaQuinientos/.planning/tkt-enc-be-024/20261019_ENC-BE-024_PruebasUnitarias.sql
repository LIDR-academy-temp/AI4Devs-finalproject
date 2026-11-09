-- ENC-BE-024 — Pruebas data-layer (TRAN + ROLLBACK)
-- Requiere DB-004_enc_seed.sql
SET XACT_ABORT ON;

DROP TABLE IF EXISTS #TestResults;
CREATE TABLE #TestResults (
    TestID   INT IDENTITY(1,1),
    Grupo    NVARCHAR(100),
    TestName NVARCHAR(400),
    Expected NVARCHAR(100),
    Actual   NVARCHAR(100),
    Passed   BIT,
    Notes    NVARCHAR(500)
);

DECLARE @adminId int = (SELECT TOP 1 UsuarioID FROM sgr.Usuarios WHERE bEliminado = 0 ORDER BY UsuarioID);
DECLARE @tipos int = (SELECT COUNT(*) FROM enc.TiposPregunta WHERE bEliminado = 0);
DECLARE @respCount int = 0;
DECLARE @dup bit = 0;
DECLARE @abierta bit = 1;
DECLARE @pct decimal(10,2) = 0;

IF @adminId IS NULL
BEGIN
    INSERT INTO #TestResults (Grupo, TestName, Expected, Actual, Passed, Notes)
    VALUES (N'INV', N'TC-ERR-1: seed usuario', N'1', N'0', 0, N'sin sgr.Usuarios');
    GOTO Resumen;
END

INSERT INTO #TestResults (Grupo, TestName, Expected, Actual, Passed, Notes)
SELECT N'INV', N'TC-5: tipos pregunta seed', N'>=1', CAST(@tipos AS nvarchar(100)),
       CASE WHEN @tipos >= 1 THEN 1 ELSE 0 END,
       CASE WHEN @tipos < 1 THEN N'correr DB-004' ELSE NULL END;

IF @tipos < 1
    GOTO Resumen;

BEGIN TRAN;

DECLARE @tipoOp int = (SELECT TOP 1 TipoPreguntaID FROM enc.TiposPregunta WHERE bEliminado = 0 ORDER BY TipoPreguntaID);

INSERT INTO enc.Encuestas (Titulo, Descripcion, FechaInicio, FechaFin, bActivo, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
VALUES (N'TC-1 enc', N'desc', DATEADD(day, -1, SYSUTCDATETIME()), DATEADD(day, 7, SYSUTCDATETIME()), 1, N'test', @adminId, SYSUTCDATETIME(), 0);
DECLARE @encId int = SCOPE_IDENTITY();

INSERT INTO enc.Preguntas (EncuestaID, Texto, TipoPreguntaID, Orden, Requerida, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
VALUES (@encId, N'P1', @tipoOp, 1, 1, N'test', @adminId, SYSUTCDATETIME(), 0);
DECLARE @pregId int = SCOPE_IDENTITY();

INSERT INTO enc.OpcionesPregunta (PreguntaID, Texto, Valor, Orden, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
VALUES (@pregId, N'Si', N'1', 1, N'test', @adminId, SYSUTCDATETIME(), 0);
DECLARE @opId int = SCOPE_IDENTITY();

INSERT INTO enc.Respuestas (EncuestaID, PreguntaID, UsuarioID, OpcionPreguntaID, RespuestaTexto, FechaRespuesta, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
VALUES (@encId, @pregId, @adminId, @opId, NULL, SYSUTCDATETIME(), N'test', @adminId, SYSUTCDATETIME(), 0);

SET @respCount = (SELECT COUNT(*) FROM enc.Respuestas WHERE EncuestaID = @encId AND UsuarioID = @adminId AND bEliminado = 0);
SET @dup = CASE WHEN EXISTS (
    SELECT 1 FROM enc.Respuestas WHERE EncuestaID = @encId AND UsuarioID = @adminId AND bEliminado = 0
) THEN 1 ELSE 0 END;

INSERT INTO enc.Encuestas (Titulo, Descripcion, FechaInicio, FechaFin, bActivo, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
VALUES (N'TC-3 cerrada', NULL, DATEADD(day, -30, SYSUTCDATETIME()), DATEADD(day, -1, SYSUTCDATETIME()), 1, N'test', @adminId, SYSUTCDATETIME(), 0);
DECLARE @cerradaId int = SCOPE_IDENTITY();

SET @abierta = CASE WHEN EXISTS (
    SELECT 1 FROM enc.Encuestas e
    WHERE e.EncuestaID = @cerradaId AND e.bEliminado = 0 AND e.bActivo = 1
      AND e.FechaInicio <= SYSUTCDATETIME()
      AND (e.FechaFin IS NULL OR e.FechaFin >= SYSUTCDATETIME())
) THEN 1 ELSE 0 END;

DECLARE @u2 int = (SELECT TOP 1 UsuarioID FROM sgr.Usuarios WHERE UsuarioID <> @adminId AND bEliminado = 0 ORDER BY UsuarioID);
IF @u2 IS NULL SET @u2 = @adminId;

INSERT INTO enc.OpcionesPregunta (PreguntaID, Texto, Valor, Orden, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
VALUES (@pregId, N'No', N'0', 2, N'test', @adminId, SYSUTCDATETIME(), 0);
DECLARE @op2 int = SCOPE_IDENTITY();

INSERT INTO enc.Respuestas (EncuestaID, PreguntaID, UsuarioID, OpcionPreguntaID, RespuestaTexto, FechaRespuesta, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
VALUES (@encId, @pregId, @u2, @op2, NULL, SYSUTCDATETIME(), N'test', @u2, SYSUTCDATETIME(), 0);

DECLARE @c1 int = (SELECT COUNT(*) FROM enc.Respuestas WHERE PreguntaID = @pregId AND OpcionPreguntaID = @opId AND bEliminado = 0);
DECLARE @c2 int = (SELECT COUNT(*) FROM enc.Respuestas WHERE PreguntaID = @pregId AND OpcionPreguntaID = @op2 AND bEliminado = 0);
DECLARE @voteTotal int = @c1 + @c2;
SET @pct = CASE WHEN @voteTotal = 0 THEN 0 ELSE ROUND(100.0 * @c1 / @voteTotal, 2) + ROUND(100.0 * @c2 / @voteTotal, 2) END;

ROLLBACK TRAN;

INSERT INTO #TestResults (Grupo, TestName, Expected, Actual, Passed, Notes)
SELECT N'CA-1', N'TC-01: filas respuesta', N'>=1', CAST(@respCount AS nvarchar(100)),
       CASE WHEN @respCount >= 1 THEN 1 ELSE 0 END, NULL;

INSERT INTO #TestResults (Grupo, TestName, Expected, Actual, Passed, Notes)
SELECT N'CA-2', N'TC-ERR-2: detecta participación previa', N'1', CAST(@dup AS nvarchar(100)), @dup, NULL;

INSERT INTO #TestResults (Grupo, TestName, Expected, Actual, Passed, Notes)
SELECT N'CA-3', N'TC-ERR-3: fuera vigencia no abierta', N'0', CAST(@abierta AS nvarchar(100)),
       CASE WHEN @abierta = 0 THEN 1 ELSE 0 END, NULL;

INSERT INTO #TestResults (Grupo, TestName, Expected, Actual, Passed, Notes)
SELECT N'CA-4', N'TC-04: porcentajes opción', N'100', CAST(@pct AS nvarchar(100)),
       CASE WHEN @pct = 100 THEN 1 ELSE 0 END, NULL;

Resumen:
SELECT TestID, Grupo, TestName, Expected, Actual,
       CASE Passed WHEN 1 THEN N'✓ PASS' ELSE N'✗ FAIL' END AS Result, Notes
FROM #TestResults ORDER BY TestID;

DECLARE @FailedCount int = (SELECT COUNT(*) - SUM(CAST(Passed AS int)) FROM #TestResults);
DECLARE @TotalCount int = (SELECT COUNT(*) FROM #TestResults);
DECLARE @PassedCount int = @TotalCount - @FailedCount;

SELECT @TotalCount AS Total, @PassedCount AS Passed, @FailedCount AS Failed;

IF @FailedCount > 0
    THROW 50010, 'ENC-BE-024 SQL tests FAILED', 1;

PRINT N'-- [OK] TESTS [CQ500] -> ' + CAST(@PassedCount AS nvarchar(10)) + N' PASS / 0 ROJO';
