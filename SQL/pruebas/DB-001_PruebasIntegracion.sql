-- DB-001 — smoke post-alineación (CuartaQuinientos)
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
SELECT N'col_sgr_Usuarios_Correo', N'1',
       CAST(COL_LENGTH(N'sgr.Usuarios', N'Correo') AS NVARCHAR(20)),
       CASE WHEN COL_LENGTH(N'sgr.Usuarios', N'Correo') IS NOT NULL THEN 1 ELSE 0 END;

INSERT INTO #TestResults (TestName, Expected, Actual, Passed)
SELECT N'col_fnz_Cuotas_CuentaID', N'1',
       CAST(COL_LENGTH(N'fnz.Cuotas', N'CuentaID') AS NVARCHAR(20)),
       CASE WHEN COL_LENGTH(N'fnz.Cuotas', N'CuentaID') IS NOT NULL THEN 1 ELSE 0 END;

INSERT INTO #TestResults (TestName, Expected, Actual, Passed)
SELECT N'table_tkt_PrioridadesTicket', N'1',
       CAST(OBJECT_ID(N'tkt.PrioridadesTicket', N'U') AS NVARCHAR(20)),
       CASE WHEN OBJECT_ID(N'tkt.PrioridadesTicket', N'U') IS NOT NULL THEN 1 ELSE 0 END;

INSERT INTO #TestResults (TestName, Expected, Actual, Passed)
SELECT N'col_ntf_TipoNotificacion', N'1',
       CAST(COL_LENGTH(N'ntf.TiposNotificacion', N'TipoNotificacion') AS NVARCHAR(20)),
       CASE WHEN COL_LENGTH(N'ntf.TiposNotificacion', N'TipoNotificacion') IS NOT NULL THEN 1 ELSE 0 END;

INSERT INTO #TestResults (TestName, Expected, Actual, Passed)
SELECT N'view_sgr_vsUsuarios', N'1',
       CAST(OBJECT_ID(N'sgr.vsUsuarios', N'V') AS NVARCHAR(20)),
       CASE WHEN OBJECT_ID(N'sgr.vsUsuarios', N'V') IS NOT NULL THEN 1 ELSE 0 END;

SELECT TestName, Expected, Actual, Passed FROM #TestResults;
DECLARE @fail INT = (SELECT COUNT(*) FROM #TestResults WHERE Passed = 0);
IF @fail > 0
    RAISERROR(N'DB-001: %d prueba(s) fallida(s).', 16, 1, @fail);
