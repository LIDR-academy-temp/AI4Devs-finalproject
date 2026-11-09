/*
  Patch prod (db24572) 2026-11-04 — menus + PerfilMenus Guardia/Trabajador para TC-NAV-08.
  Idempotente. Ejecutado via MCP smoke; no sustituye DB-008 completo en otros ambientes.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;
DECLARE @Now datetime = SYSUTCDATETIME();
DECLARE @By nvarchar(40) = N'smoke-nav-patch';
DECLARE @ActorId int = (SELECT TOP 1 UsuarioID FROM sgr.Usuarios WHERE Correo = N'admin@local' AND bEliminado = 0);
DECLARE @PerfilGuardiaId int = (SELECT PerfilID FROM sgr.Perfiles WHERE Nombre = N'Guardia' AND bEliminado = 0);
DECLARE @PerfilTrabajadorId int = (SELECT PerfilID FROM sgr.Perfiles WHERE Nombre = N'Trabajador' AND bEliminado = 0);
IF @PerfilGuardiaId IS NULL OR @PerfilTrabajadorId IS NULL
    THROW 50001, N'Perfiles Guardia/Trabajador no encontrados', 1;
BEGIN TRAN;
IF NOT EXISTS (SELECT 1 FROM sgr.Menus WHERE Ruta = N'/guardia/validar-pase' AND bEliminado = 0)
    INSERT INTO sgr.Menus (TituloMenu, Ruta, Icono, Orden, PadreMenuID, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
    VALUES (N'Validar pase QR', N'/guardia/validar-pase', N'scan', 5, NULL, @By, @ActorId, @Now, 0);
IF NOT EXISTS (SELECT 1 FROM sgr.Menus WHERE Ruta = N'/trabajador/tickets' AND bEliminado = 0)
    INSERT INTO sgr.Menus (TituloMenu, Ruta, Icono, Orden, PadreMenuID, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
    VALUES (N'Tickets asignados', N'/trabajador/tickets', N'ticket', 6, NULL, @By, @ActorId, @Now, 0);
DECLARE @GrpMiCuenta int = (SELECT TOP 1 MenuID FROM sgr.Menus WHERE TituloMenu = N'Mi Cuenta' AND PadreMenuID IS NULL AND bEliminado = 0 ORDER BY MenuID);
IF @GrpMiCuenta IS NULL
BEGIN
    INSERT INTO sgr.Menus (TituloMenu, Ruta, Icono, Orden, PadreMenuID, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
    VALUES (N'Mi Cuenta', NULL, NULL, 9, NULL, @By, @ActorId, @Now, 0);
    SET @GrpMiCuenta = SCOPE_IDENTITY();
END
IF NOT EXISTS (SELECT 1 FROM sgr.Menus WHERE Ruta = N'/notificaciones' AND bEliminado = 0)
    INSERT INTO sgr.Menus (TituloMenu, Ruta, Icono, Orden, PadreMenuID, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
    VALUES (N'Notificaciones', N'/notificaciones', N'bell', 12, @GrpMiCuenta, @By, @ActorId, @Now, 0);
DECLARE @MenuIds TABLE (PerfilID int NOT NULL, MenuID int NOT NULL);
INSERT INTO @MenuIds (PerfilID, MenuID)
SELECT @PerfilGuardiaId, m.MenuID FROM sgr.Menus m
WHERE m.bEliminado = 0 AND m.Ruta IN (N'/', N'/perfil', N'/notificaciones', N'/guardia/validar-pase');
INSERT INTO @MenuIds (PerfilID, MenuID)
SELECT @PerfilTrabajadorId, m.MenuID FROM sgr.Menus m
WHERE m.bEliminado = 0 AND m.Ruta IN (N'/', N'/perfil', N'/notificaciones', N'/trabajador/tickets');
MERGE sgr.PerfilMenus AS t
USING @MenuIds AS s ON t.PerfilID = s.PerfilID AND t.MenuID = s.MenuID
WHEN MATCHED THEN UPDATE SET bEliminado = 0, bVisible = 1, Modificado = @By, UsuarioModificacionID = @ActorId, FechaModificacion = @Now
WHEN NOT MATCHED BY TARGET THEN
    INSERT (PerfilID, MenuID, bVisible, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
    VALUES (s.PerfilID, s.MenuID, 1, @By, @ActorId, @Now, 0);
COMMIT TRAN;
