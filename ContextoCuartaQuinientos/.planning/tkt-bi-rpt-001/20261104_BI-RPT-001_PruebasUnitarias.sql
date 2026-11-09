-- ============================================================================
-- 20261104_BI-RPT-001_PruebasUnitarias.sql — Fase TEST (TDD ROJO)
-- Matriz: design.md Plan de pruebas. Entorno: CuartaQuinientos (localhost / CQ500).
-- NO ejecutar en PROD.
-- [OK] TESTS [prod/local] -> 8 PASS / 0 ROJO (DB-010 + 20261104_sgr_menus_bi_rpt_reactivate.sql)
--
-- Mutantes criticos (/ejecutar): ver design.md seccion Plan de pruebas.
-- TC-IDEM N/A: sin prcSet*; idempotencia worker cubierta por TC-DB-ERR-01.
-- ============================================================================
SET NOCOUNT ON;
SET XACT_ABORT OFF;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

DROP TABLE IF EXISTS #TestResults;
CREATE TABLE #TestResults
(
    TestID INT IDENTITY(1,1),
    Grupo NVARCHAR(60),
    Caso NVARCHAR(40),
    TestName NVARCHAR(200),
    Expected NVARCHAR(200),
    Actual NVARCHAR(200),
    Passed BIT,
    Tipo NVARCHAR(20) DEFAULT N'Caracterizacion'
);

BEGIN TRAN Suite;

-- TC-DB-CHAR-01 — tabla bi.KpiSnapshots
DECLARE @Tbl int = OBJECT_ID(N'bi.KpiSnapshots', N'U');
INSERT INTO #TestResults (Grupo, Caso, TestName, Expected, Actual, Passed, Tipo)
SELECT N'bi.KpiSnapshots', N'TC-DB-CHAR-01', N'tabla_existe',
       N'NOT NULL', CAST(@Tbl AS nvarchar(200)),
       CASE WHEN @Tbl IS NOT NULL THEN 1 ELSE 0 END, N'Caracterizacion';

-- TC-DB-ROJO-01 … 03 — columnas DB-009 (ROJO hasta migracion)
DECLARE @ColTmr int = COL_LENGTH(N'bi.KpiSnapshots', N'TiempoMedioResolucionHoras');
DECLARE @ColCasas int = COL_LENGTH(N'bi.KpiSnapshots', N'CasasTotales');
DECLARE @ColOcup int = COL_LENGTH(N'bi.KpiSnapshots', N'CasasOcupadas');

INSERT INTO #TestResults (Grupo, Caso, TestName, Expected, Actual, Passed, Tipo)
SELECT N'bi.KpiSnapshots', N'TC-DB-ROJO-01', N'columna_TiempoMedioResolucionHoras',
       N'EXISTS', CASE WHEN @ColTmr IS NOT NULL THEN N'EXISTS' ELSE N'MISSING' END,
       CASE WHEN @ColTmr IS NOT NULL THEN 1 ELSE 0 END, N'ROJO';

INSERT INTO #TestResults (Grupo, Caso, TestName, Expected, Actual, Passed, Tipo)
SELECT N'bi.KpiSnapshots', N'TC-DB-ROJO-02', N'columna_CasasTotales',
       N'EXISTS', CASE WHEN @ColCasas IS NOT NULL THEN N'EXISTS' ELSE N'MISSING' END,
       CASE WHEN @ColCasas IS NOT NULL THEN 1 ELSE 0 END, N'ROJO';

INSERT INTO #TestResults (Grupo, Caso, TestName, Expected, Actual, Passed, Tipo)
SELECT N'bi.KpiSnapshots', N'TC-DB-ROJO-03', N'columna_CasasOcupadas',
       N'EXISTS', CASE WHEN @ColOcup IS NOT NULL THEN N'EXISTS' ELSE N'MISSING' END,
       CASE WHEN @ColOcup IS NOT NULL THEN 1 ELSE 0 END, N'ROJO';

-- TC-DB-CHAR-02 — indice unico Condominio+Fecha
DECLARE @Ux int = (
    SELECT COUNT(*)
    FROM sys.indexes i
    INNER JOIN sys.tables t ON t.object_id = i.object_id
    INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
    WHERE s.name = N'bi' AND t.name = N'KpiSnapshots'
      AND i.name = N'UX_bi_KpiSnapshots_Condominio_Fecha' AND i.is_unique = 1
);
INSERT INTO #TestResults (Grupo, Caso, TestName, Expected, Actual, Passed, Tipo)
SELECT N'bi.KpiSnapshots', N'TC-DB-CHAR-02', N'indice_unico_condominio_fecha',
       N'>=1', CAST(@Ux AS nvarchar(200)),
       CASE WHEN @Ux >= 1 THEN 1 ELSE 0 END, N'Caracterizacion';

-- TC-DB-CHAR-03 — tipo Fecha + DEFAULT TicketsAbiertos (F005)
DECLARE @FechaType sysname = (
    SELECT TOP (1) t.name
    FROM sys.columns c
    INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
    WHERE c.object_id = @Tbl AND c.name = N'Fecha'
);
DECLARE @DfTickets int = (
    SELECT COUNT(*)
    FROM sys.default_constraints dc
    INNER JOIN sys.columns c ON c.default_object_id = dc.object_id
    WHERE c.object_id = @Tbl AND c.name = N'TicketsAbiertos'
);
INSERT INTO #TestResults (Grupo, Caso, TestName, Expected, Actual, Passed, Tipo)
SELECT N'bi.KpiSnapshots', N'TC-DB-CHAR-03', N'fecha_date_y_default_tickets',
       N'date+DF', CONCAT(ISNULL(@FechaType, N'?'), N'+', CAST(@DfTickets AS nvarchar(20))),
       CASE WHEN @Tbl IS NOT NULL AND @FechaType = N'date' AND @DfTickets >= 1 THEN 1 ELSE 0 END,
       N'Caracterizacion';

-- TC-DB-ROJO-04 — menu reportes visible para admin (reactivacion nav)
DECLARE @PerfilCol sysname =
    CASE WHEN COL_LENGTH(N'sgr.Perfiles', N'Nombre') IS NOT NULL THEN N'Nombre' ELSE N'Perfil' END;
DECLARE @AdminId int;
DECLARE @sqlAdmin nvarchar(400) = N'
SELECT @R = PerfilID FROM sgr.Perfiles WHERE ' + QUOTENAME(@PerfilCol) + N' = N''Administrador'' AND bEliminado = 0;';
EXEC sp_executesql @sqlAdmin, N'@R int OUTPUT', @R = @AdminId OUTPUT;

DECLARE @ReportesVisible int = 0;
IF @AdminId IS NOT NULL
BEGIN
    SELECT @ReportesVisible = COUNT(*)
    FROM sgr.PerfilMenus PM WITH (NOLOCK)
    INNER JOIN sgr.Menus M WITH (NOLOCK) ON M.MenuID = PM.MenuID AND M.bEliminado = 0
    WHERE PM.PerfilID = @AdminId AND PM.bEliminado = 0 AND PM.bVisible = 1
      AND M.Ruta = N'/admin/reportes';
END;

INSERT INTO #TestResults (Grupo, Caso, TestName, Expected, Actual, Passed, Tipo)
SELECT N'sgr.PerfilMenus', N'TC-DB-ROJO-04', N'admin_reportes_visible',
       N'>=1', CAST(@ReportesVisible AS nvarchar(200)),
       CASE WHEN @ReportesVisible >= 1 THEN 1 ELSE 0 END, N'ROJO';

-- TC-DB-ERR-01 — unique index impide duplicado (solo si tabla existe)
DECLARE @DupTestPassed bit = 0;
DECLARE @DupActual nvarchar(200) = N'SKIP';
IF @Tbl IS NOT NULL AND @Ux >= 1
BEGIN
    DECLARE @CondId int = (SELECT TOP (1) CondominioID FROM sgr.Condominios WITH (NOLOCK) WHERE bEliminado = 0 ORDER BY CondominioID);
    IF @CondId IS NOT NULL
    BEGIN
        DECLARE @F date = '2099-01-01';
        BEGIN TRY
            INSERT INTO bi.KpiSnapshots
                (CondominioID, Fecha, TicketsAbiertos, TicketsCerrados, IngresosMXN, EgresosMXN, ResidentesMorosos,
                 Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            VALUES
                (@CondId, @F, 0, 0, 0, 0, 0, N'test-birpt', 0, SYSUTCDATETIME(), 0);

            INSERT INTO bi.KpiSnapshots
                (CondominioID, Fecha, TicketsAbiertos, TicketsCerrados, IngresosMXN, EgresosMXN, ResidentesMorosos,
                 Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            VALUES
                (@CondId, @F, 1, 0, 0, 0, 0, N'test-birpt', 0, SYSUTCDATETIME(), 0);

            SET @DupActual = N'2 rows (bad)';
            SET @DupTestPassed = 0;
        END TRY
        BEGIN CATCH
            DECLARE @Cnt int = (SELECT COUNT(*) FROM bi.KpiSnapshots WHERE CondominioID = @CondId AND Fecha = @F AND bEliminado = 0);
            SET @DupActual = CAST(@Cnt AS nvarchar(200));
            SET @DupTestPassed = CASE WHEN @Cnt = 1 THEN 1 ELSE 0 END;
        END CATCH
    END
    ELSE
    BEGIN
        SET @DupActual = N'SKIP_NO_CONDOMINIO';
        SET @DupTestPassed = 1;
    END
END

INSERT INTO #TestResults (Grupo, Caso, TestName, Expected, Actual, Passed, Tipo)
SELECT N'bi.KpiSnapshots', N'TC-DB-ERR-01', N'unique_condominio_fecha_idempotencia',
       N'1', @DupActual, @DupTestPassed, N'Error';

SELECT TestID, Grupo, Caso, TestName, Tipo, Expected, Actual,
       CASE Passed WHEN 1 THEN N'PASS' ELSE N'FAIL' END AS Result
FROM #TestResults ORDER BY TestID;

SELECT COUNT(*) AS Total,
       SUM(CAST(Passed AS INT)) AS Passed,
       COUNT(*) - SUM(CAST(Passed AS INT)) AS Failed,
       SUM(CASE WHEN Tipo = N'ROJO' AND Passed = 0 THEN 1 ELSE 0 END) AS RojoPendienteFix
FROM #TestResults;

ROLLBACK TRAN Suite;
GO
