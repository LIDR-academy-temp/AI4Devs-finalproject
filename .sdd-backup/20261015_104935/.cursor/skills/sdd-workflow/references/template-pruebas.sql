-- ============================================================================
-- <yyyymmdd>_<TKT>_PruebasIntegracion.sql — Pruebas de comportamiento (Unidad 7)
-- Genera: agente tester-sql / api-tester. Endurece: skill abogado-del-diablo.
-- NO ejecutar en PROD. Verificar en <MCP_TEST> (sdd.config.yaml -> vars.MCP_TEST).
--
-- REGLAS DE CALIDAD (obligatorias — el hook check-tests-green.ps1 bloquea si faltan):
--   1) Anti-Test-Theater: el humano define el QUE; prohibido test tautologico.
--      >=1 caso NEGATIVO / de error / ROJO (no solo happy path).
--   2) Characterization primero si es legacy/refactor (fija comportamiento actual,
--      marca lo que parece bug). Un caso [ROJO] por cada bug a corregir.
--   3) Edge cases de dominio que la IA no deduce del codigo (reglas de negocio).
--   4) Evidencia de ejecucion: correr el suite y anotar en el encabezado:
--        -- [OK] TESTS [<entorno>] -> <N> PASS / <M> ROJO esperado
--      (sin esa anotacion el suite se considera NO ejecutado).
--
-- GOTCHAS T-SQL del andamiaje (aprendidos a golpes):
--   - No recrear el mismo #temp en un batch: usar variables de tabla / nombres unicos.
--   - CONCAT()/NEWID() NO son argumento valido de EXEC: pre-construir en variable.
--   - INSERT..EXEC NO funciona sobre un SP que termina en FOR JSON: validar por
--     tablas base + el contrato JSON en la capa API.
--   - Aislar: BEGIN TRAN ... ROLLBACK al final (no ensucia datos).
--   - Semilla determinista: preferir fixture creado/limpiado por el propio script
--     (idempotente) antes que IDs acoplados a un fixture externo.
-- ============================================================================
-- [OK] TESTS [<entorno>] -> <N> PASS / <M> ROJO esperado    <-- anotar tras ejecutar
SET NOCOUNT ON;
SET XACT_ABORT OFF;

DROP TABLE IF EXISTS #TestResults;
CREATE TABLE #TestResults
(
    TestID INT IDENTITY(1,1), Grupo NVARCHAR(60), Caso NVARCHAR(40), TestName NVARCHAR(200),
    Expected NVARCHAR(200), Actual NVARCHAR(200), Passed BIT, Tipo NVARCHAR(20) DEFAULT N'Caracterizacion'
    -- Tipo: Caracterizacion | ROJO | Happy | Borde | Error
);

-- ---------------------------------------------------------------------------
-- ARRANGE global (semilla idempotente). Sustituir <...> por vars reales.
-- ---------------------------------------------------------------------------
-- DECLARE @... ;   -- IDs de semilla verificados en <MCP_TEST>

BEGIN TRAN Suite;

-- === <Objeto SQL> ==========================================================
-- <caso Happy>  (AAA: Arrange arriba / Act EXEC / Assert contra resultset+tabla)
-- DECLARE @cN TABLE (...);
-- INSERT INTO @cN EXEC <schema>.<sp> <args>;   -- args: NADA de CONCAT() inline
-- INSERT INTO #TestResults (Grupo,Caso,TestName,Expected,Actual,Passed,Tipo)
-- SELECT N'<grupo>',N'CA-1',N'<escenario>_<esperado>',N'<esperado>',
--        CAST(MAX(...) AS NVARCHAR(200)),CASE WHEN ... THEN 1 ELSE 0 END,N'Happy' FROM @cN;

-- <caso NEGATIVO/ERROR>  (OBLIGATORIO — anti-Test-Theater)
-- ...  N'Error'

-- <caso [ROJO]>  (si hay bug confirmado: asertar el comportamiento CORRECTO;
--   falla hasta que se corrija el SP)  ...  N'ROJO'

-- === RESULTADOS ============================================================
SELECT TestID, Grupo, Caso, TestName, Tipo, Expected, Actual,
       CASE Passed WHEN 1 THEN N'PASS' ELSE N'FAIL' END AS Result
FROM #TestResults ORDER BY TestID;

SELECT COUNT(*) AS Total, SUM(CAST(Passed AS INT)) AS Passed,
       COUNT(*)-SUM(CAST(Passed AS INT)) AS Failed,
       SUM(CASE WHEN Tipo=N'ROJO' AND Passed=0 THEN 1 ELSE 0 END) AS RojoPendienteFix
FROM #TestResults;

ROLLBACK TRAN Suite;
GO
