-- DB-000 — smoke estructura (ejecutar en CuartaQuinientos, no en master)
-- [PENDIENTE] TESTS [local] -> sin ejecutar en esta sesión
SET NOCOUNT ON;

DROP TABLE IF EXISTS #TestResults;
CREATE TABLE #TestResults (
    TestID INT IDENTITY(1,1),
    TestName NVARCHAR(200),
    Expected NVARCHAR(100),
    Actual NVARCHAR(100),
    Passed BIT
);

INSERT INTO #TestResults (TestName, Expected, Actual, Passed)
SELECT N'schema_sgr', N'1', CAST(SCHEMA_ID(N'sgr') AS NVARCHAR(20)), CASE WHEN SCHEMA_ID(N'sgr') IS NOT NULL THEN 1 ELSE 0 END;

INSERT INTO #TestResults (TestName, Expected, Actual, Passed)
SELECT N'schema_fnz', N'1', CAST(SCHEMA_ID(N'fnz') AS NVARCHAR(20)), CASE WHEN SCHEMA_ID(N'fnz') IS NOT NULL THEN 1 ELSE 0 END;

INSERT INTO #TestResults (TestName, Expected, Actual, Passed)
SELECT N'table_fnz_Cuotas', N'1',
       CAST(OBJECT_ID(N'fnz.Cuotas', N'U') AS NVARCHAR(20)),
       CASE WHEN OBJECT_ID(N'fnz.Cuotas', N'U') IS NOT NULL THEN 1 ELSE 0 END;

SELECT TestName, Expected, Actual, Passed FROM #TestResults;
DECLARE @fail INT = (SELECT COUNT(*) FROM #TestResults WHERE Passed = 0);
IF @fail > 0
    RAISERROR(N'DB-000: %d prueba(s) fallida(s).', 16, 1, @fail);
