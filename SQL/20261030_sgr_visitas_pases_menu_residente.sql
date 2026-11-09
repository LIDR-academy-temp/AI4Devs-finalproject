/*
  Visitas residente — menú dinámico (sgr.Menus + PerfilMenus).

  Residente → Mi Comunidad → Pases QR (/visitas/pases)

  Si no ves el ítem: ejecutar este script (o DB-008 completo) y cerrar sesión / refrescar.

  sqlcmd -S <server> -d CuartaQuinientos -E -b -I -f 65001 -i SQL/20261030_sgr_visitas_pases_menu_residente.sql
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @Now datetime = SYSUTCDATETIME();
DECLARE @By nvarchar(100) = N'20261030-visitas-pases';
DECLARE @ActorId int = (SELECT TOP 1 UsuarioID FROM sgr.Usuarios WHERE bEliminado = 0 ORDER BY UsuarioID);
IF @ActorId IS NULL SET @ActorId = 1;

DECLARE @PerfilCol sysname =
    CASE
        WHEN COL_LENGTH(N'sgr.Perfiles', N'Perfil') IS NOT NULL THEN N'Perfil'
        WHEN COL_LENGTH(N'sgr.Perfiles', N'Nombre') IS NOT NULL THEN N'Nombre'
        ELSE N'Perfil'
    END;

DECLARE @PerfilResidenteId int;

DECLARE @sql nvarchar(400) = N'
SELECT @ResId = PerfilID FROM sgr.Perfiles WHERE ' + QUOTENAME(@PerfilCol) + N' = N''Residente'' AND bEliminado = 0;';

EXEC sp_executesql @sql, N'@ResId int OUTPUT', @ResId = @PerfilResidenteId OUTPUT;

IF @PerfilResidenteId IS NULL
BEGIN
    RAISERROR(N'Perfil Residente no encontrado (DB-002).', 16, 1);
    RETURN;
END;

DECLARE @GrpComResId int;
DECLARE @MenuVisitasPasesId int;

MERGE sgr.Menus AS t
USING (SELECT N'Mi Comunidad' AS TituloMenu, CAST(NULL AS nvarchar(250)) AS Ruta, CAST(NULL AS nvarchar(100)) AS Icono, 19 AS Orden) AS s
ON t.TituloMenu = s.TituloMenu AND t.PadreMenuID IS NULL AND t.Ruta IS NULL AND t.bEliminado = 0
WHEN NOT MATCHED BY TARGET THEN
    INSERT (TituloMenu, Ruta, Icono, Orden, PadreMenuID, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
    VALUES (s.TituloMenu, s.Ruta, s.Icono, s.Orden, NULL, @By, @ActorId, @Now, 0);

SELECT @GrpComResId = MenuID FROM sgr.Menus WHERE TituloMenu = N'Mi Comunidad' AND PadreMenuID IS NULL AND Ruta IS NULL AND bEliminado = 0;

MERGE sgr.Menus AS t
USING (SELECT N'Pases QR' AS TituloMenu, N'/visitas/pases' AS Ruta, N'qr' AS Icono, 25 AS Orden, @GrpComResId AS PadreMenuID) AS s
ON t.Ruta = s.Ruta AND t.bEliminado = 0
WHEN MATCHED THEN
    UPDATE SET TituloMenu = s.TituloMenu, Icono = s.Icono, Orden = s.Orden, PadreMenuID = s.PadreMenuID,
        Modificado = @By, UsuarioModificacionID = @ActorId, FechaModificacion = @Now
WHEN NOT MATCHED BY TARGET THEN
    INSERT (TituloMenu, Ruta, Icono, Orden, PadreMenuID, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
    VALUES (s.TituloMenu, s.Ruta, s.Icono, s.Orden, s.PadreMenuID, @By, @ActorId, @Now, 0);

SELECT @MenuVisitasPasesId = MenuID FROM sgr.Menus WHERE Ruta = N'/visitas/pases' AND bEliminado = 0;

MERGE sgr.PerfilMenus AS t
USING (
    SELECT @PerfilResidenteId AS PerfilID, @GrpComResId AS MenuID
    UNION ALL SELECT @PerfilResidenteId, @MenuVisitasPasesId
) AS s ON t.PerfilID = s.PerfilID AND t.MenuID = s.MenuID
WHEN MATCHED THEN
    UPDATE SET bEliminado = 0, bVisible = 1, Modificado = @By, UsuarioModificacionID = @ActorId, FechaModificacion = @Now
WHEN NOT MATCHED BY TARGET THEN
    INSERT (PerfilID, MenuID, bVisible, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
    VALUES (s.PerfilID, s.MenuID, 1, @By, @ActorId, @Now, 0);

PRINT N'Menú visitas-pases MenuID=' + ISNULL(CAST(@MenuVisitasPasesId AS nvarchar(10)), N'?')
    + N' Perfil ResidenteID=' + CAST(@PerfilResidenteId AS nvarchar(10));

DECLARE @ver nvarchar(max) = N'
SELECT N''PerfilMenus visitas'' AS CheckId,
       p.' + QUOTENAME(@PerfilCol) + N' AS Perfil,
       m.TituloMenu,
       m.Ruta,
       pm.bVisible
FROM sgr.PerfilMenus pm
INNER JOIN sgr.Menus m ON m.MenuID = pm.MenuID AND m.bEliminado = 0
INNER JOIN sgr.Perfiles p ON p.PerfilID = pm.PerfilID AND p.bEliminado = 0
WHERE m.Ruta = N''/visitas/pases''
  AND pm.bEliminado = 0;';

EXEC sp_executesql @ver;

GO
