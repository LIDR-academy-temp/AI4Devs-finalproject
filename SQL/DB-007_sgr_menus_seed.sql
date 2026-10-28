/*
  DB-007 — Seed menús SPA + PerfilMenus (ticket funcional DB-006 / SGR-FE-001).
  Alineado con Web/src/shared/navigation/appNavigation.ts y App.tsx.
  Idempotente. Requiere DB-002 (perfiles Administrador / Residente).

  sqlcmd -S localhost -E -d CuartaQuinientos -i SQL/DB-007_sgr_menus_seed.sql
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF OBJECT_ID(N'sgr.Menus', N'U') IS NULL
BEGIN
    RAISERROR(N'Tabla sgr.Menus no existe. Ejecutar cuartaquinientos_schema / DB-001.', 16, 1);
    RETURN;
END;

DECLARE @Now datetime = SYSUTCDATETIME();
DECLARE @By nvarchar(100) = N'DB-007';
DECLARE @ActorId int = (SELECT TOP 1 UsuarioID FROM sgr.Usuarios WHERE bEliminado = 0 ORDER BY UsuarioID);
IF @ActorId IS NULL SET @ActorId = 1;

DECLARE @PerfilCol sysname =
    CASE WHEN COL_LENGTH(N'sgr.Perfiles', N'Nombre') IS NOT NULL THEN N'Nombre' ELSE N'Perfil' END;

DECLARE @PerfilAdminId int;
DECLARE @PerfilResidenteId int;

DECLARE @sql nvarchar(500) = N'
SELECT @AdminId = PerfilID FROM sgr.Perfiles WHERE ' + QUOTENAME(@PerfilCol) + N' = N''Administrador'' AND bEliminado = 0;
SELECT @ResId = PerfilID FROM sgr.Perfiles WHERE ' + QUOTENAME(@PerfilCol) + N' = N''Residente'' AND bEliminado = 0;';

EXEC sp_executesql @sql,
    N'@AdminId int OUTPUT, @ResId int OUTPUT',
    @AdminId = @PerfilAdminId OUTPUT,
    @ResId = @PerfilResidenteId OUTPUT;

IF @PerfilAdminId IS NULL OR @PerfilResidenteId IS NULL
BEGIN
    RAISERROR(N'Perfiles Administrador/Residente no encontrados. Ejecutar DB-002.', 16, 1);
    RETURN;
END;

DECLARE @Nodes TABLE (
    Clave nvarchar(40) NOT NULL PRIMARY KEY,
    TituloMenu nvarchar(150) NOT NULL,
    Ruta nvarchar(250) NULL,
    Icono nvarchar(100) NULL,
    Orden int NOT NULL,
    PadreClave nvarchar(40) NULL
);

INSERT INTO @Nodes (Clave, TituloMenu, Ruta, Icono, Orden, PadreClave) VALUES
 (N'inicio', N'Inicio', N'/', N'home', 0, NULL),
 (N'grp-mi-cuenta', N'Mi Cuenta', NULL, NULL, 10, NULL),
 (N'perfil', N'Mi Perfil', N'/perfil', N'user', 11, N'grp-mi-cuenta'),
 (N'finanzas-cuenta', N'Estado de cuenta', N'/finanzas/cuenta', N'wallet', 12, N'grp-mi-cuenta'),
 (N'grp-comunidad-res', N'Mi Comunidad', NULL, NULL, 20, NULL),
 (N'anuncios', N'Anuncios', N'/anuncios', N'megaphone', 21, N'grp-comunidad-res'),
 (N'encuestas', N'Encuestas', N'/encuestas', N'chart', 22, N'grp-comunidad-res'),
 (N'juntas', N'Juntas', N'/juntas', N'calendar', 23, N'grp-comunidad-res'),
 (N'archivos', N'Archivos', N'/archivos', N'folder', 24, N'grp-comunidad-res'),
 (N'areas-comunes', N'Áreas Comunes', N'/areas-comunes', N'tree', 25, N'grp-comunidad-res'),
 (N'grp-registros-res', N'Mis Registros', NULL, NULL, 30, NULL),
 (N'tickets', N'Mis Tickets', N'/tickets', N'ticket', 31, N'grp-registros-res'),
 (N'mis-vehiculos', N'Mis Vehículos', N'/mis-vehiculos', N'car', 32, N'grp-registros-res'),
 (N'mis-mascotas', N'Mis Mascotas', N'/mis-mascotas', N'paw', 33, N'grp-registros-res'),
 (N'grp-gestion', N'Gestión', NULL, NULL, 40, NULL),
 (N'admin-tickets', N'Tickets', N'/admin/tickets', N'tickets', 41, N'grp-gestion'),
 (N'admin-usuarios', N'Residentes', N'/admin/usuarios', N'users', 42, N'grp-gestion'),
 (N'admin-casas', N'Casas', N'/admin/casas', N'building', 43, N'grp-gestion'),
 (N'admin-finanzas', N'Finanzas', N'/admin/finanzas', N'dollar', 44, N'grp-gestion'),
 (N'admin-menus', N'Menús', N'/admin/menus', N'layout', 45, N'grp-gestion'),
 (N'admin-perfiles', N'Perfiles', N'/admin/perfiles', N'shield', 46, N'grp-gestion'),
 (N'grp-comunidad-adm', N'Comunidad', NULL, NULL, 50, NULL),
 (N'admin-anuncios', N'Anuncios', N'/admin/anuncios', N'megaphone', 51, N'grp-comunidad-adm'),
 (N'admin-encuestas', N'Encuestas', N'/admin/encuestas', N'chart', 52, N'grp-comunidad-adm'),
 (N'admin-juntas', N'Juntas', N'/admin/juntas', N'calendar', 53, N'grp-comunidad-adm'),
 (N'admin-archivos', N'Archivos', N'/admin/archivos', N'folder', 54, N'grp-comunidad-adm'),
 (N'admin-archivos-tipos', N'Tipos de documento', N'/admin/archivos/tipos', N'folder', 55, N'grp-comunidad-adm'),
 (N'grp-registro-adm', N'Registro', NULL, NULL, 60, NULL),
 (N'admin-visitas', N'Visitas', N'/admin/visitas', N'eye', 61, N'grp-registro-adm'),
 (N'admin-vehiculos', N'Vehículos', N'/admin/vehiculos', N'car', 62, N'grp-registro-adm'),
 (N'admin-mascotas', N'Mascotas', N'/admin/mascotas', N'paw', 63, N'grp-registro-adm'),
 (N'admin-almacen', N'Almacén', N'/admin/almacen', N'warehouse', 64, N'grp-registro-adm');

DECLARE @Map TABLE (Clave nvarchar(40) PRIMARY KEY, MenuID int NOT NULL);

BEGIN TRAN;

;WITH Parents AS (
    SELECT Clave, TituloMenu, Ruta, Icono, Orden
    FROM @Nodes WHERE PadreClave IS NULL
)
MERGE sgr.Menus AS t
USING Parents AS s ON t.TituloMenu = s.TituloMenu AND t.PadreMenuID IS NULL
    AND ((t.Ruta IS NULL AND s.Ruta IS NULL) OR t.Ruta = s.Ruta)
    AND t.bEliminado = 0
WHEN MATCHED THEN
    UPDATE SET TituloMenu = s.TituloMenu, Ruta = s.Ruta, Icono = s.Icono, Orden = s.Orden,
        Modificado = @By, UsuarioModificacionID = @ActorId, FechaModificacion = @Now
WHEN NOT MATCHED BY TARGET THEN
    INSERT (TituloMenu, Ruta, Icono, Orden, PadreMenuID, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
    VALUES (s.TituloMenu, s.Ruta, s.Icono, s.Orden, NULL, @By, @ActorId, @Now, 0);

INSERT INTO @Map (Clave, MenuID)
SELECT n.Clave, m.MenuID
FROM @Nodes n
INNER JOIN sgr.Menus m ON m.bEliminado = 0 AND m.PadreMenuID IS NULL
    AND ((n.Ruta IS NULL AND m.Ruta IS NULL) OR m.Ruta = n.Ruta)
    AND m.TituloMenu = n.TituloMenu
WHERE n.PadreClave IS NULL;

;WITH Children AS (
    SELECT n.Clave, n.TituloMenu, n.Ruta, n.Icono, n.Orden, p.MenuID AS PadreMenuID
    FROM @Nodes n
    INNER JOIN @Map p ON p.Clave = n.PadreClave
    WHERE n.PadreClave IS NOT NULL
)
MERGE sgr.Menus AS t
USING Children AS s ON t.Ruta = s.Ruta AND t.bEliminado = 0
WHEN MATCHED THEN
    UPDATE SET TituloMenu = s.TituloMenu, Icono = s.Icono, Orden = s.Orden, PadreMenuID = s.PadreMenuID,
        Modificado = @By, UsuarioModificacionID = @ActorId, FechaModificacion = @Now
WHEN NOT MATCHED BY TARGET THEN
    INSERT (TituloMenu, Ruta, Icono, Orden, PadreMenuID, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
    VALUES (s.TituloMenu, s.Ruta, s.Icono, s.Orden, s.PadreMenuID, @By, @ActorId, @Now, 0);

INSERT INTO @Map (Clave, MenuID)
SELECT n.Clave, m.MenuID
FROM @Nodes n
INNER JOIN sgr.Menus m ON m.Ruta = n.Ruta AND m.bEliminado = 0
WHERE n.PadreClave IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM @Map x WHERE x.Clave = n.Clave);

DECLARE @PerfilMenu TABLE (Clave nvarchar(40) NOT NULL, PerfilID int NOT NULL);

INSERT INTO @PerfilMenu (Clave, PerfilID)
SELECT Clave, @PerfilResidenteId FROM @Nodes
WHERE Clave IN (
    N'inicio', N'grp-mi-cuenta', N'perfil', N'finanzas-cuenta',
    N'grp-comunidad-res', N'anuncios', N'encuestas', N'juntas', N'archivos', N'areas-comunes',
    N'grp-registros-res', N'tickets', N'mis-vehiculos', N'mis-mascotas'
);

INSERT INTO @PerfilMenu (Clave, PerfilID)
SELECT Clave, @PerfilAdminId FROM @Nodes
WHERE Clave LIKE N'admin-%' OR Clave IN (
    N'inicio', N'grp-gestion', N'grp-comunidad-adm', N'grp-registro-adm',
    N'grp-mi-cuenta', N'perfil'
);

MERGE sgr.PerfilMenus AS t
USING (
    SELECT pm.PerfilID, m.MenuID
    FROM @PerfilMenu pm
    INNER JOIN @Map m ON m.Clave = pm.Clave
) AS s ON t.PerfilID = s.PerfilID AND t.MenuID = s.MenuID
WHEN MATCHED THEN
    UPDATE SET
        bEliminado = 0,
        bVisible = 1,
        Modificado = @By,
        UsuarioModificacionID = @ActorId,
        FechaModificacion = @Now
WHEN NOT MATCHED BY TARGET THEN
    INSERT (PerfilID, MenuID, bVisible, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
    VALUES (s.PerfilID, s.MenuID, 1, @By, @ActorId, @Now, 0);

COMMIT TRAN;

DECLARE @NodeCount int = (SELECT COUNT(*) FROM @Map);
PRINT N'DB-007: menus y PerfilMenus sembrados. Nodos=' + CAST(@NodeCount AS nvarchar(10)) + N'.';
