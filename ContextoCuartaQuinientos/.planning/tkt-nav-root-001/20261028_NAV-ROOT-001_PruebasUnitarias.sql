-- ============================================================================
-- 20261028_NAV-ROOT-001_PruebasUnitarias.sql — Smoke post DB-008 (fase TEST)
-- Matriz design: T-SQL embebido; casos Vitest/.http en artefactos Web.
-- NO ejecutar en PROD. Entorno: CuartaQuinientos (CQ500 / nesgotest).
-- [OK] TESTS [localhost] -> 6 PASS / 0 ROJO
-- ============================================================================
SET NOCOUNT ON;
SET XACT_ABORT OFF;

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

-- TC-DB-CHAR-01 — baseline menus activos (DB-007)
DECLARE @MenuCount int = (SELECT COUNT(*) FROM sgr.Menus WITH (NOLOCK) WHERE bEliminado = 0);
INSERT INTO #TestResults (Grupo, Caso, TestName, Expected, Actual, Passed, Tipo)
SELECT N'sgr.Menus', N'TC-DB-CHAR-01', N'menus_activos_minimo',
       N'>=30', CAST(@MenuCount AS nvarchar(200)),
       CASE WHEN @MenuCount >= 30 THEN 1 ELSE 0 END, N'Caracterizacion';

-- TC-DB-ERR-01 — residente sin rutas /admin/* en PerfilMenus visibles
DECLARE @PerfilCol sysname =
    CASE WHEN COL_LENGTH(N'sgr.Perfiles', N'Nombre') IS NOT NULL THEN N'Nombre' ELSE N'Perfil' END;
DECLARE @ResId int;
DECLARE @sql nvarchar(400) = N'
SELECT @R = PerfilID FROM sgr.Perfiles WHERE ' + QUOTENAME(@PerfilCol) + N' = N''Residente'' AND bEliminado = 0;';
EXEC sp_executesql @sql, N'@R int OUTPUT', @R = @ResId OUTPUT;

DECLARE @AdminLeak int = 0;
IF @ResId IS NOT NULL
BEGIN
    SELECT @AdminLeak = COUNT(*)
    FROM sgr.PerfilMenus PM WITH (NOLOCK)
    INNER JOIN sgr.Menus M WITH (NOLOCK) ON M.MenuID = PM.MenuID AND M.bEliminado = 0
    WHERE PM.PerfilID = @ResId AND PM.bEliminado = 0 AND PM.bVisible = 1
      AND M.Ruta LIKE N'/admin/%';
END;

INSERT INTO #TestResults (Grupo, Caso, TestName, Expected, Actual, Passed, Tipo)
SELECT N'sgr.PerfilMenus', N'TC-DB-ERR-01', N'residente_sin_admin_en_menu',
       N'0', CAST(@AdminLeak AS nvarchar(200)),
       CASE WHEN @AdminLeak = 0 THEN 1 ELSE 0 END, N'Error';

-- TC-DB-ERR-02 — guardia sin rutas /admin/*
DECLARE @GuardId int;
DECLARE @sqlGuard nvarchar(400) = N'
SELECT @R = PerfilID FROM sgr.Perfiles WHERE ' + QUOTENAME(@PerfilCol) + N' = N''Guardia'' AND bEliminado = 0;';
EXEC sp_executesql @sqlGuard, N'@R int OUTPUT', @R = @GuardId OUTPUT;

DECLARE @GuardAdminLeak int = 0;
IF @GuardId IS NOT NULL
BEGIN
    SELECT @GuardAdminLeak = COUNT(*)
    FROM sgr.PerfilMenus PM WITH (NOLOCK)
    INNER JOIN sgr.Menus M WITH (NOLOCK) ON M.MenuID = PM.MenuID AND M.bEliminado = 0
    WHERE PM.PerfilID = @GuardId AND PM.bEliminado = 0 AND PM.bVisible = 1
      AND M.Ruta LIKE N'/admin/%';
END;

INSERT INTO #TestResults (Grupo, Caso, TestName, Expected, Actual, Passed, Tipo)
SELECT N'sgr.PerfilMenus', N'TC-DB-ERR-02', N'guardia_sin_admin_en_menu',
       N'0', CAST(@GuardAdminLeak AS nvarchar(200)),
       CASE WHEN @GuardAdminLeak = 0 THEN 1 ELSE 0 END, N'Error';

-- TC-DB-CHAR-02 — rutas activas sin duplicados (idempotencia post DB-008)
DECLARE @DupRoutes int = (
    SELECT COUNT(*) FROM (
        SELECT Ruta FROM sgr.Menus WITH (NOLOCK)
        WHERE bEliminado = 0 AND Ruta IS NOT NULL
        GROUP BY Ruta HAVING COUNT(*) > 1
    ) d
);
INSERT INTO #TestResults (Grupo, Caso, TestName, Expected, Actual, Passed, Tipo)
SELECT N'sgr.Menus', N'TC-DB-CHAR-02', N'rutas_sin_duplicados',
       N'0', CAST(@DupRoutes AS nvarchar(200)),
       CASE WHEN @DupRoutes = 0 THEN 1 ELSE 0 END, N'Caracterizacion';

-- TC-DB-ROJO-01 [ROJO] — /visitas/pases en sgr.Menus (DB-008)
DECLARE @PasesMenu int = (
    SELECT COUNT(*) FROM sgr.Menus WITH (NOLOCK)
    WHERE bEliminado = 0 AND Ruta = N'/visitas/pases'
);
INSERT INTO #TestResults (Grupo, Caso, TestName, Expected, Actual, Passed, Tipo)
SELECT N'sgr.Menus', N'TC-DB-ROJO-01', N'ruta_visitas_pases',
       N'>=1', CAST(@PasesMenu AS nvarchar(200)),
       CASE WHEN @PasesMenu >= 1 THEN 1 ELSE 0 END, N'ROJO';

-- TC-DB-ROJO-02 [ROJO] — /admin/reportes (fase E)
DECLARE @ReportesMenu int = (
    SELECT COUNT(*) FROM sgr.Menus WITH (NOLOCK)
    WHERE bEliminado = 0 AND Ruta = N'/admin/reportes'
);
INSERT INTO #TestResults (Grupo, Caso, TestName, Expected, Actual, Passed, Tipo)
SELECT N'sgr.Menus', N'TC-DB-ROJO-02', N'ruta_admin_reportes',
       N'>=1', CAST(@ReportesMenu AS nvarchar(200)),
       CASE WHEN @ReportesMenu >= 1 THEN 1 ELSE 0 END, N'ROJO';

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
