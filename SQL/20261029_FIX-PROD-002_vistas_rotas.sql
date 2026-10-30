-- ============================================================
-- FIX-PROD-002  Corregir vistas rotas en producción
-- Fecha  : 2026-10-29
-- Causa  : sgr.vsUsuarios (y dependientes) referencian columnas
--          con nombres "nuevos" (Nombre/Correo/bActivo) pero la BD
--          de producción usa nombres "legacy" (NombreUsuario/CorreoUsuario/bActivoUsuario).
--          Síntoma: endpoints que tocan sgr.Usuarios devuelven HTTP 500.
--
-- INSTRUCCIONES:
--   1. Primero ejecuta DIAGNOSTICO_PROD.sql para confirmar el estado.
--   2. Si el resultado del STEP 4 (prueba de vista) muestra ERROR
--      Y las columnas son "NombreUsuario/CorreoUsuario" (legacy):
--      → Ejecutar OPCION A (drop vistas).
--   3. Si el STEP 4 dice OK pero igual hay 500: reiniciar la API
--      (ver más abajo) para limpiar la caché en memoria.
-- ============================================================

-- ============================================================
-- OPCION A: Eliminar vistas rotas para que el API use
--           las consultas de respaldo (no necesita reinicio de BD,
--           solo reinicio del proceso API para limpiar la caché).
-- ============================================================

-- Eliminar en orden por dependencias
IF OBJECT_ID('usr.vsMascotas',   'V') IS NOT NULL DROP VIEW usr.vsMascotas;
IF OBJECT_ID('usr.vsAutomoviles','V') IS NOT NULL DROP VIEW usr.vsAutomoviles;
IF OBJECT_ID('sgr.vsUsuarios',   'V') IS NOT NULL DROP VIEW sgr.vsUsuarios;
IF OBJECT_ID('sgr.vsPerfiles',   'V') IS NOT NULL DROP VIEW sgr.vsPerfiles;
IF OBJECT_ID('sgr.vsCasas',      'V') IS NOT NULL DROP VIEW sgr.vsCasas;

PRINT 'Vistas eliminadas. El API detectará las columnas legacy automáticamente al reiniciarse.';
GO

-- ============================================================
-- OPCION B (alternativa): Recrear vistas usando nombres legacy
--   Usar solo si prefieres mantener las vistas.
--   Solo aplica si sgr.Usuarios tiene NombreUsuario/CorreoUsuario/bActivoUsuario.
-- ============================================================
/*
CREATE OR ALTER VIEW sgr.vsUsuarios AS
SELECT U.UsuarioID,
       U.CorreoUsuario          AS CorreoUsuario,
       U.PerfilID,
       P.Perfil                 AS Perfil,
       P.bAdministrador,
       U.PasswordUsuario        AS PasswordUsuario,
       U.NombreUsuario          AS NombreUsuario,
       U.TelefonoUsuario        AS TelefonoUsuario,
       U.FotoUrl                AS FotoUrlUsuario,
       U.bActivoUsuario         AS bActivoUsuario,
       U.bEliminado,
       U.bActualizarPassword
FROM sgr.Usuarios U WITH (NOLOCK)
INNER JOIN sgr.Perfiles P WITH (NOLOCK) ON P.PerfilID = U.PerfilID;
GO

CREATE OR ALTER VIEW usr.vsMascotas AS
SELECT M.MascotaID,
       M.UsuarioID,
       U.NombreUsuario          AS NombreUsuario,
       U.CorreoUsuario          AS CorreoUsuario,
       M.NombreMascota          AS NombreMascota,
       M.TipoMascotaID,
       TM.TipoMascota,
       M.RazaMascotaID,
       M.RazaLibre,
       COALESCE(M.RazaLibre, RM.RazaMascota) AS RazaMascota,
       M.FechaNacimiento,
       M.bEliminado
FROM usr.Mascotas M WITH (NOLOCK)
INNER JOIN sgr.Usuarios U WITH (NOLOCK)      ON U.UsuarioID       = M.UsuarioID
INNER JOIN usr.TiposMascota TM WITH (NOLOCK) ON TM.TipoMascotaID  = M.TipoMascotaID
LEFT  JOIN usr.RazasMascota RM WITH (NOLOCK) ON RM.RazaMascotaID  = M.RazaMascotaID;
GO

CREATE OR ALTER VIEW usr.vsAutomoviles AS
SELECT A.AutomovilID,
       A.UsuarioID,
       U.NombreUsuario          AS NombreUsuario,
       U.CorreoUsuario          AS CorreoUsuario,
       A.MarcaID,
       Ma.Marca,
       A.ModeloID,
       A.ModeloLibre,
       COALESCE(A.ModeloLibre, Mo.Modelo) AS Modelo,
       A.Placas,
       A.Color,
       A.bEliminado
FROM usr.Automoviles A WITH (NOLOCK)
LEFT JOIN sgr.Usuarios U  WITH (NOLOCK) ON U.UsuarioID  = A.UsuarioID
LEFT JOIN usr.Marcas Ma   WITH (NOLOCK) ON Ma.MarcaID   = A.MarcaID
LEFT JOIN usr.Modelos Mo  WITH (NOLOCK) ON Mo.ModeloID  = A.ModeloID;
GO

PRINT 'Vistas recreadas con nombres legacy.';
*/
