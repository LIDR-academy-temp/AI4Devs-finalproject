/*
  PROD-ADMIN-001 — Diagnóstico de huecos (ejecutar en la MISMA BD que usa la API).
  SmarterASP / sqlcmd: base CuartaQuinientos (o la de appsettings.Production.json).
*/
SET NOCOUNT ON;

DECLARE @db sysname = DB_NAME();
PRINT N'=== PROD-ADMIN-001 VALIDAR_GAPS ===';
PRINT N'Base actual: ' + @db;

SELECT
    Objeto,
    CASE WHEN Estado = N'OK' THEN N'OK' ELSE N'FALTA' END AS Resultado,
    Accion
FROM (
    VALUES
        (N'wms.Articulos',
         CASE WHEN OBJECT_ID(N'wms.Articulos', N'U') IS NOT NULL THEN N'OK' ELSE N'FALTA' END,
         N'Ejecutar DB-005_wms_schema.sql (o 20261029_PROD-ADMIN-001_APLICAR_FALTANTES.sql)'),

        (N'wms.CategoriasArticulo',
         CASE WHEN OBJECT_ID(N'wms.CategoriasArticulo', N'U') IS NOT NULL THEN N'OK' ELSE N'FALTA' END,
         N'Incluido en DB-005'),

        (N'arc.vsArchivos.FechaCreacion',
         CASE WHEN COL_LENGTH(N'arc.vsArchivos', N'FechaCreacion') IS NOT NULL THEN N'OK' ELSE N'FALTA' END,
         N'Ejecutar DB-006_arc_vsarchivos_fechacreacion.sql'),

        (N'sgr.RefreshTokens',
         CASE WHEN OBJECT_ID(N'sgr.RefreshTokens', N'U') IS NOT NULL THEN N'OK' ELSE N'FALTA' END,
         N'Ya cubierto si aplicaste DB-009'),

        (N'enc.Respuestas.EncuestaID',
         CASE WHEN COL_LENGTH(N'enc.Respuestas', N'EncuestaID') IS NOT NULL THEN N'OK' ELSE N'LEGACY' END,
         N'API encuestas usa JOIN si falta columna (redeploy API)'),

        (N'usr.Mascotas.VacunasAlDia',
         CASE WHEN COL_LENGTH(N'usr.Mascotas', N'VacunasAlDia') IS NOT NULL THEN N'OK' ELSE N'OPCIONAL' END,
         N'Sin script; API omite columna si no existe')
) AS v(Objeto, Estado, Accion)
ORDER BY Objeto;

PRINT N'';
PRINT N'Si wms.Articulos = FALTA → almacén mostrará error WMS.';
PRINT N'Si arc.vsArchivos.FechaCreacion = FALTA → /admin/archivos 500.';
PRINT N'No ejecutar DB-001 en prod legacy (CategoriasTicket).';
