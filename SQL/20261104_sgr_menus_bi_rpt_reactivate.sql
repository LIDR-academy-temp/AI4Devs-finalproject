/*
  BI-RPT-001 — menús Reportes + Aviso (fase E/G) para Administrador en prod.

  1) Crea/actualiza sgr.Menus (rutas BI) si no existían (p. ej. sin DB-008).
  2) MERGE sgr.PerfilMenus Administrador + bVisible=1.
  3) Mantiene BOT (/admin/integraciones/bot) oculto si existe.
  4) Reactiva bVisible=0 → 1 en filas ya existentes.

  Prerrequisito: perfil Administrador (DB-002). Alternativa completa: DB-008 antes de este script.

  sqlcmd -S <server> -d CuartaQuinientos -E -b -I -f 65001 -i SQL/20261104_sgr_menus_bi_rpt_reactivate.sql
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

DECLARE @Now datetime = SYSUTCDATETIME();
DECLARE @By nvarchar(100) = N'20261104-BI-RPT-001';
DECLARE @ActorId int = (SELECT TOP 1 UsuarioID FROM sgr.Usuarios WITH (NOLOCK) WHERE bEliminado = 0 ORDER BY UsuarioID);
IF @ActorId IS NULL SET @ActorId = 1;

DECLARE @PerfilCol sysname =
    CASE
        WHEN COL_LENGTH(N'sgr.Perfiles', N'Nombre') IS NOT NULL THEN N'Nombre'
        WHEN COL_LENGTH(N'sgr.Perfiles', N'Perfil') IS NOT NULL THEN N'Perfil'
        ELSE N'Perfil'
    END;

DECLARE @PerfilAdminId int;
DECLARE @sqlAdmin nvarchar(400) = N'
SELECT @R = PerfilID FROM sgr.Perfiles WHERE ' + QUOTENAME(@PerfilCol) + N' = N''Administrador'' AND bEliminado = 0;';
EXEC sp_executesql @sqlAdmin, N'@R int OUTPUT', @R = @PerfilAdminId OUTPUT;

IF @PerfilAdminId IS NULL
BEGIN
    RAISERROR(N'Perfil Administrador no encontrado. Ejecutar DB-002 seeds perfiles.', 16, 1);
    RETURN;
END;

BEGIN TRAN;

DECLARE @GrpGestionId int = (
    SELECT TOP (1) MenuID FROM sgr.Menus WITH (UPDLOCK, HOLDLOCK)
     WHERE bEliminado = 0 AND PadreMenuID IS NULL AND Ruta IS NULL AND TituloMenu = N'Gestión'
     ORDER BY MenuID
);

IF @GrpGestionId IS NULL
BEGIN
    INSERT INTO sgr.Menus (TituloMenu, Ruta, Icono, Orden, PadreMenuID, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
    VALUES (N'Gestión', NULL, NULL, 39, NULL, @By, @ActorId, @Now, 0);
    SET @GrpGestionId = SCOPE_IDENTITY();
END;

DECLARE @MenuReportesId int = (
    SELECT TOP (1) MenuID FROM sgr.Menus WITH (UPDLOCK, HOLDLOCK)
     WHERE bEliminado = 0 AND Ruta = N'/admin/reportes'
     ORDER BY MenuID
);

IF @MenuReportesId IS NULL
BEGIN
    INSERT INTO sgr.Menus (TituloMenu, Ruta, Icono, Orden, PadreMenuID, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
    VALUES (N'Reportes', N'/admin/reportes', N'chart', 47, @GrpGestionId, @By, @ActorId, @Now, 0);
    SET @MenuReportesId = SCOPE_IDENTITY();
END
ELSE
BEGIN
    UPDATE sgr.Menus
       SET TituloMenu = N'Reportes', Icono = N'chart', Orden = 47, PadreMenuID = @GrpGestionId,
           Modificado = @By, UsuarioModificacionID = @ActorId, FechaModificacion = @Now
     WHERE MenuID = @MenuReportesId;
END;

DECLARE @MenuAvisoId int = (
    SELECT TOP (1) MenuID FROM sgr.Menus WITH (UPDLOCK, HOLDLOCK)
     WHERE bEliminado = 0 AND Ruta = N'/admin/notificaciones/aviso'
     ORDER BY MenuID
);

IF @MenuAvisoId IS NULL
BEGIN
    INSERT INTO sgr.Menus (TituloMenu, Ruta, Icono, Orden, PadreMenuID, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
    VALUES (N'Aviso general', N'/admin/notificaciones/aviso', N'megaphone', 49, @GrpGestionId, @By, @ActorId, @Now, 0);
    SET @MenuAvisoId = SCOPE_IDENTITY();
END
ELSE
BEGIN
    UPDATE sgr.Menus
       SET TituloMenu = N'Aviso general', Icono = N'megaphone', Orden = 49, PadreMenuID = @GrpGestionId,
           Modificado = @By, UsuarioModificacionID = @ActorId, FechaModificacion = @Now
     WHERE MenuID = @MenuAvisoId;
END;

MERGE sgr.PerfilMenus AS t
USING (
    SELECT @PerfilAdminId AS PerfilID, @MenuReportesId AS MenuID
    UNION ALL
    SELECT @PerfilAdminId, @MenuAvisoId
) AS s ON t.PerfilID = s.PerfilID AND t.MenuID = s.MenuID
WHEN MATCHED THEN
    UPDATE SET bVisible = 1, bEliminado = 0,
        Modificado = @By, UsuarioModificacionID = @ActorId, FechaModificacion = @Now
WHEN NOT MATCHED BY TARGET THEN
    INSERT (PerfilID, MenuID, bVisible, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
    VALUES (s.PerfilID, s.MenuID, 1, @By, @ActorId, @Now, 0);

UPDATE pm
SET pm.bVisible = 0,
    pm.Modificado = @By,
    pm.UsuarioModificacionID = @ActorId,
    pm.FechaModificacion = @Now
FROM sgr.PerfilMenus pm
INNER JOIN sgr.Menus m ON m.MenuID = pm.MenuID AND m.bEliminado = 0
WHERE pm.bEliminado = 0
  AND pm.PerfilID = @PerfilAdminId
  AND m.Ruta = N'/admin/integraciones/bot';

UPDATE pm
SET pm.bVisible = 1,
    pm.Modificado = @By,
    pm.UsuarioModificacionID = @ActorId,
    pm.FechaModificacion = @Now
FROM sgr.PerfilMenus pm
INNER JOIN sgr.Menus m ON m.MenuID = pm.MenuID AND m.bEliminado = 0
WHERE pm.bEliminado = 0
  AND pm.PerfilID = @PerfilAdminId
  AND pm.bVisible = 0
  AND m.Ruta IN (N'/admin/reportes', N'/admin/notificaciones/aviso');

PRINT N'BI-RPT menus: ReportesID=' + CAST(@MenuReportesId AS nvarchar(10))
    + N' AvisoID=' + CAST(@MenuAvisoId AS nvarchar(10));

COMMIT TRAN;

DECLARE @CheckSql nvarchar(max) = N'
SELECT N''Check BI-RPT nav on'' AS CheckId,
       p.' + QUOTENAME(@PerfilCol) + N' AS Perfil,
       m.TituloMenu,
       m.Ruta,
       pm.bVisible
FROM sgr.PerfilMenus pm WITH (NOLOCK)
INNER JOIN sgr.Menus m WITH (NOLOCK) ON m.MenuID = pm.MenuID AND m.bEliminado = 0
INNER JOIN sgr.Perfiles p WITH (NOLOCK) ON p.PerfilID = pm.PerfilID AND p.bEliminado = 0
WHERE pm.bEliminado = 0
  AND pm.PerfilID = @AdminId
  AND m.Ruta IN (N''/admin/reportes'', N''/admin/notificaciones/aviso'')
ORDER BY m.Orden;';

EXEC sp_executesql @CheckSql, N'@AdminId int', @AdminId = @PerfilAdminId;
GO
