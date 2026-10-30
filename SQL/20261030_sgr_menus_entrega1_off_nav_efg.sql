/*
  Entrega 1 — ocultar menus NAV-ROOT fases E/F/G en PerfilMenus (no borra sgr.Menus).

  Rutas:
    /admin/reportes
    /admin/integraciones/bot
    /admin/notificaciones/aviso

  Revert entrega 2: SET bVisible = 1 con mismo filtro de rutas.

  sqlcmd -S <server> -d CuartaQuinientos -E -b -I -f 65001 -i SQL/20261030_sgr_menus_entrega1_off_nav_efg.sql
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @Now datetime = SYSUTCDATETIME();
DECLARE @By nvarchar(100) = N'20261030-FE-NAV-ENT1-001';
DECLARE @ActorId int = (SELECT TOP 1 UsuarioID FROM sgr.Usuarios WITH (NOLOCK) WHERE bEliminado = 0 ORDER BY UsuarioID);
IF @ActorId IS NULL SET @ActorId = 1;

BEGIN TRAN;

UPDATE pm
SET pm.bVisible = 0,
    pm.Modificado = @By,
    pm.UsuarioModificacionID = @ActorId,
    pm.FechaModificacion = @Now
FROM sgr.PerfilMenus pm WITH (NOLOCK)
INNER JOIN sgr.Menus m WITH (NOLOCK) ON m.MenuID = pm.MenuID AND m.bEliminado = 0
WHERE pm.bEliminado = 0
  AND pm.bVisible = 1
  AND m.Ruta IN (
    N'/admin/reportes',
    N'/admin/integraciones/bot',
    N'/admin/notificaciones/aviso'
  );

PRINT N'PerfilMenus ocultos (bVisible=0) filas=' + CAST(@@ROWCOUNT AS nvarchar(10));

COMMIT TRAN;

SELECT N'Check entrega1 nav off' AS CheckId,
       p.Perfil,
       m.TituloMenu,
       m.Ruta,
       pm.bVisible
FROM sgr.PerfilMenus pm WITH (NOLOCK)
INNER JOIN sgr.Menus m WITH (NOLOCK) ON m.MenuID = pm.MenuID AND m.bEliminado = 0
INNER JOIN sgr.Perfiles p WITH (NOLOCK) ON p.PerfilID = pm.PerfilID AND p.bEliminado = 0
WHERE pm.bEliminado = 0
  AND m.Ruta IN (
    N'/admin/reportes',
    N'/admin/integraciones/bot',
    N'/admin/notificaciones/aviso'
  )
ORDER BY p.Perfil, m.Orden;

GO
