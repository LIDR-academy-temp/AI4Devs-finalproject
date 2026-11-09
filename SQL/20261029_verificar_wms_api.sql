/*
  Ejecutar en la MISMA base que usa la API (connection string en runasp.net).
  Si ArticulosObj IS NULL → correr 20261029_PROD-ADMIN-001_APLICAR_FALTANTES.sql aqui.
*/
SET NOCOUNT ON;

SELECT
    DB_NAME() AS BaseDatos,
    OBJECT_ID(N'wms.Articulos', N'U') AS ArticulosObj,
    OBJECT_ID(N'wms.CategoriasArticulo', N'U') AS CategoriasObj,
    CASE WHEN OBJECT_ID(N'wms.Articulos', N'U') IS NOT NULL THEN N'OK' ELSE N'FALTA' END AS WmsListo;

IF OBJECT_ID(N'wms.Articulos', N'U') IS NOT NULL
    SELECT COUNT(*) AS ArticulosActivos FROM wms.Articulos WHERE bEliminado = 0;
GO
