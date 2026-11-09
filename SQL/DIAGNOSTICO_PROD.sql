-- ============================================================
-- DIAGNOSTICO: Ejecuta esto en prod para entender el estado
-- ============================================================

-- 1. ¿Qué columnas tiene sgr.Usuarios en prod?
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'sgr' AND TABLE_NAME = 'Usuarios'
ORDER BY ORDINAL_POSITION;

-- 2. ¿Las vistas críticas existen?
SELECT 
    CASE WHEN OBJECT_ID('sgr.vsUsuarios',  'V') IS NOT NULL THEN 'SI' ELSE 'NO' END AS vsUsuarios_existe,
    CASE WHEN OBJECT_ID('usr.vsMascotas',  'V') IS NOT NULL THEN 'SI' ELSE 'NO' END AS vsMascotas_existe,
    CASE WHEN OBJECT_ID('usr.vsAutomoviles','V') IS NOT NULL THEN 'SI' ELSE 'NO' END AS vsAutomoviles_existe,
    CASE WHEN OBJECT_ID('tkt.CategoriasTicket','U') IS NOT NULL THEN 'SI' ELSE 'NO' END AS CategoriasTicket_existe;

-- 3. Si sgr.vsUsuarios existe, ¿qué columnas expone? 
--    (sys.columns guarda la definición original aunque la vista esté rota)
SELECT c.name AS columna_vista
FROM sys.columns c
INNER JOIN sys.views v ON v.object_id = c.object_id
INNER JOIN sys.schemas s ON s.schema_id = v.schema_id
WHERE s.name = 'sgr' AND v.name = 'vsUsuarios'
ORDER BY c.column_id;

-- 4. Prueba real: ¿la vista puede ejecutarse?
BEGIN TRY
    DECLARE @test INT;
    SELECT TOP (1) @test = UsuarioID FROM sgr.vsUsuarios WITH (NOLOCK);
    SELECT 'OK - vista funciona' AS resultado_vista;
END TRY
BEGIN CATCH
    SELECT 'ERROR: ' + ERROR_MESSAGE() AS resultado_vista;
END CATCH;

-- 5. ¿La tabla sgr.Usuarios tiene la columna "Nombre" (nueva) o "NombreUsuario" (legacy)?
SELECT 
    CASE WHEN COL_LENGTH('sgr.Usuarios','Nombre')        IS NOT NULL THEN 'SI' ELSE 'NO' END AS tiene_Nombre,
    CASE WHEN COL_LENGTH('sgr.Usuarios','NombreUsuario') IS NOT NULL THEN 'SI' ELSE 'NO' END AS tiene_NombreUsuario,
    CASE WHEN COL_LENGTH('sgr.Usuarios','Correo')        IS NOT NULL THEN 'SI' ELSE 'NO' END AS tiene_Correo,
    CASE WHEN COL_LENGTH('sgr.Usuarios','CorreoUsuario') IS NOT NULL THEN 'SI' ELSE 'NO' END AS tiene_CorreoUsuario;
