/*
  VTS — Áreas comunes / reservas: menú dinámico (sgr.Menus + PerfilMenus) + catálogos mínimos.

  Menú:
    Residente  → Mi Comunidad → Áreas Comunes     (/areas-comunes)
    Admin      → Registro      → Áreas y reservas (/admin/areas-reservas)

  Si no ves el ítem: ejecutar este script (o DB-008 completo) y cerrar sesión / refrescar.

  sqlcmd ... -b -I -f 65001 -i SQL/20261029_vts_areas_menus_y_seed.sql
  (-I y -f 65001: archivo UTF-8; literales con acento usan NCHAR para no depender del editor)
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @Now datetime = SYSUTCDATETIME();
DECLARE @By nvarchar(100) = N'20261029-vts-areas';
DECLARE @ActorId int = (SELECT TOP 1 UsuarioID FROM sgr.Usuarios WHERE bEliminado = 0 ORDER BY UsuarioID);
IF @ActorId IS NULL SET @ActorId = 1;

DECLARE @PerfilCol sysname =
    CASE
        WHEN COL_LENGTH(N'sgr.Perfiles', N'Perfil') IS NOT NULL THEN N'Perfil'
        WHEN COL_LENGTH(N'sgr.Perfiles', N'Nombre') IS NOT NULL THEN N'Nombre'
        ELSE N'Perfil'
    END;

DECLARE @PerfilAdminId int;
DECLARE @PerfilResidenteId int;

DECLARE @sql nvarchar(600) = N'
SELECT @AdminId = PerfilID FROM sgr.Perfiles WHERE ' + QUOTENAME(@PerfilCol) + N' = N''Administrador'' AND bEliminado = 0;
SELECT @ResId = PerfilID FROM sgr.Perfiles WHERE ' + QUOTENAME(@PerfilCol) + N' = N''Residente'' AND bEliminado = 0;';

EXEC sp_executesql @sql,
    N'@AdminId int OUTPUT, @ResId int OUTPUT',
    @AdminId = @PerfilAdminId OUTPUT,
    @ResId = @PerfilResidenteId OUTPUT;

IF @PerfilAdminId IS NULL OR @PerfilResidenteId IS NULL
BEGIN
    RAISERROR(N'Perfiles Administrador/Residente no encontrados (DB-002).', 16, 1);
    RETURN;
END;

-- ── 1. Nodos de menú (grupos + ítems VTS) ───────────────────────────────────
DECLARE @GrpComResId int;
DECLARE @GrpRegAdmId int;
DECLARE @MenuAreasResId int;
DECLARE @MenuAreasComunesId int;

MERGE sgr.Menus AS t
USING (SELECT N'Mi Comunidad' AS TituloMenu, CAST(NULL AS nvarchar(250)) AS Ruta, CAST(NULL AS nvarchar(100)) AS Icono, 19 AS Orden) AS s
ON t.TituloMenu = s.TituloMenu AND t.PadreMenuID IS NULL AND t.Ruta IS NULL AND t.bEliminado = 0
WHEN NOT MATCHED BY TARGET THEN
    INSERT (TituloMenu, Ruta, Icono, Orden, PadreMenuID, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
    VALUES (s.TituloMenu, s.Ruta, s.Icono, s.Orden, NULL, @By, @ActorId, @Now, 0);

SELECT @GrpComResId = MenuID FROM sgr.Menus WHERE TituloMenu = N'Mi Comunidad' AND PadreMenuID IS NULL AND Ruta IS NULL AND bEliminado = 0;

MERGE sgr.Menus AS t
USING (SELECT N'Registro' AS TituloMenu, CAST(NULL AS nvarchar(250)) AS Ruta, CAST(NULL AS nvarchar(100)) AS Icono, 59 AS Orden) AS s
ON t.TituloMenu = s.TituloMenu AND t.PadreMenuID IS NULL AND t.Ruta IS NULL AND t.bEliminado = 0
WHEN NOT MATCHED BY TARGET THEN
    INSERT (TituloMenu, Ruta, Icono, Orden, PadreMenuID, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
    VALUES (s.TituloMenu, s.Ruta, s.Icono, s.Orden, NULL, @By, @ActorId, @Now, 0);

SELECT @GrpRegAdmId = MenuID FROM sgr.Menus WHERE TituloMenu = N'Registro' AND PadreMenuID IS NULL AND Ruta IS NULL AND bEliminado = 0;

MERGE sgr.Menus AS t
USING (SELECT NCHAR(193) + N'reas Comunes' AS TituloMenu, N'/areas-comunes' AS Ruta, N'tree' AS Icono, 24 AS Orden, @GrpComResId AS PadreMenuID) AS s
ON t.Ruta = s.Ruta AND t.bEliminado = 0
WHEN MATCHED THEN
    UPDATE SET TituloMenu = s.TituloMenu, Icono = s.Icono, Orden = s.Orden, PadreMenuID = s.PadreMenuID,
        Modificado = @By, UsuarioModificacionID = @ActorId, FechaModificacion = @Now
WHEN NOT MATCHED BY TARGET THEN
    INSERT (TituloMenu, Ruta, Icono, Orden, PadreMenuID, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
    VALUES (s.TituloMenu, s.Ruta, s.Icono, s.Orden, s.PadreMenuID, @By, @ActorId, @Now, 0);

SELECT @MenuAreasComunesId = MenuID FROM sgr.Menus WHERE Ruta = N'/areas-comunes' AND bEliminado = 0;

MERGE sgr.Menus AS t
USING (SELECT NCHAR(193) + N'reas y reservas' AS TituloMenu, N'/admin/areas-reservas' AS Ruta, N'tree' AS Icono, 61 AS Orden, @GrpRegAdmId AS PadreMenuID) AS s
ON t.Ruta = s.Ruta AND t.bEliminado = 0
WHEN MATCHED THEN
    UPDATE SET TituloMenu = s.TituloMenu, Icono = s.Icono, Orden = s.Orden, PadreMenuID = s.PadreMenuID,
        Modificado = @By, UsuarioModificacionID = @ActorId, FechaModificacion = @Now
WHEN NOT MATCHED BY TARGET THEN
    INSERT (TituloMenu, Ruta, Icono, Orden, PadreMenuID, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
    VALUES (s.TituloMenu, s.Ruta, s.Icono, s.Orden, s.PadreMenuID, @By, @ActorId, @Now, 0);

SELECT @MenuAreasResId = MenuID FROM sgr.Menus WHERE Ruta = N'/admin/areas-reservas' AND bEliminado = 0;

-- PerfilMenus: visible para Residente (áreas) y Admin (áreas y reservas + grupos)
MERGE sgr.PerfilMenus AS t
USING (
    SELECT @PerfilResidenteId AS PerfilID, @GrpComResId AS MenuID
    UNION ALL SELECT @PerfilResidenteId, @MenuAreasComunesId
    UNION ALL SELECT @PerfilAdminId, @GrpRegAdmId
    UNION ALL SELECT @PerfilAdminId, @MenuAreasResId
) AS s ON t.PerfilID = s.PerfilID AND t.MenuID = s.MenuID
WHEN MATCHED THEN
    UPDATE SET bEliminado = 0, bVisible = 1, Modificado = @By, UsuarioModificacionID = @ActorId, FechaModificacion = @Now
WHEN NOT MATCHED BY TARGET THEN
    INSERT (PerfilID, MenuID, bVisible, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
    VALUES (s.PerfilID, s.MenuID, 1, @By, @ActorId, @Now, 0);

PRINT N'Menú VTS: areas-comunes MenuID=' + ISNULL(CAST(@MenuAreasComunesId AS nvarchar(10)), N'?')
    + N', admin-areas-reservas MenuID=' + ISNULL(CAST(@MenuAreasResId AS nvarchar(10)), N'?');

-- ── 2. Catálogo estados de reserva ─────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM vts.ReservacionesEstados WHERE bEliminado = 0)
BEGIN
    INSERT INTO vts.ReservacionesEstados (ReservacionEstado, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
    VALUES
        (N'Pendiente', @By, @ActorId, @Now, 0),
        (N'Confirmada', @By, @ActorId, @Now, 0),
        (N'Cancelada', @By, @ActorId, @Now, 0);
    PRINT N'vts.ReservacionesEstados: insertados Pendiente/Confirmada/Cancelada.';
END
ELSE
    PRINT N'vts.ReservacionesEstados: ya existían filas.';

-- ── 3. Áreas reservables (solo si tabla vacía) ─────────────────────────────
DECLARE @ColAreaNombre sysname =
    CASE
        WHEN COL_LENGTH(N'vts.AreasComunes', N'AreasComunes') IS NOT NULL THEN N'AreasComunes'
        WHEN COL_LENGTH(N'vts.AreasComunes', N'Nombre') IS NOT NULL THEN N'Nombre'
    END;

DECLARE @Salon nvarchar(150) = N'Sal' + NCHAR(243) + N'n de eventos';
DECLARE @DescSalon nvarchar(500) = N'Reservaci' + NCHAR(243) + N'n con 48 h de anticipaci' + NCHAR(243) + N'n.';
DECLARE @DescPalapa nvarchar(500) = NCHAR(193) + N'rea exterior; horario 9:00-21:00.';

IF @ColAreaNombre IS NULL
BEGIN
    RAISERROR(N'vts.AreasComunes: no existe columna AreasComunes ni Nombre.', 16, 1);
    RETURN;
END;

IF NOT EXISTS (SELECT 1 FROM vts.AreasComunes WHERE bEliminado = 0)
BEGIN
    DECLARE @ins nvarchar(max) = N'
    INSERT INTO vts.AreasComunes (
        ' + QUOTENAME(@ColAreaNombre) + N', DescripcionAreasComunes, Capacidad, RequiereReservacion,
        Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
    VALUES
        (@Salon, @DescSalon, 80, 1, @By, @ActorId, @Now, 0),
        (N''Palapa'', @DescPalapa, 30, 1, @By, @ActorId, @Now, 0),
        (N''Cancha deportiva'', N''Sujeto a reglamento interno.'', 20, 1, @By, @ActorId, @Now, 0);';

    EXEC sp_executesql @ins,
        N'@Salon nvarchar(150), @DescSalon nvarchar(500), @DescPalapa nvarchar(500), @By nvarchar(100), @ActorId int, @Now datetime',
        @Salon = @Salon, @DescSalon = @DescSalon, @DescPalapa = @DescPalapa, @By = @By, @ActorId = @ActorId, @Now = @Now;

    PRINT N'vts.AreasComunes: 3 areas de ejemplo (columna ' + @ColAreaNombre + N').';
END
ELSE
    PRINT N'vts.AreasComunes: ya hay areas; no se insertaron ejemplos.';

-- Corregir mojibake si el script se ejecuto sin UTF-8 (SalÃ³n, etc.)
DECLARE @fixSalon nvarchar(max) = N'
UPDATE vts.AreasComunes
SET ' + QUOTENAME(@ColAreaNombre) + N' = @Salon,
    DescripcionAreasComunes = @DescSalon
WHERE bEliminado = 0
  AND ' + QUOTENAME(@ColAreaNombre) + N' LIKE N''Sal%n de eventos''
  AND ' + QUOTENAME(@ColAreaNombre) + N' COLLATE Latin1_General_BIN LIKE N''%Ã%'';';

EXEC sp_executesql @fixSalon,
    N'@Salon nvarchar(150), @DescSalon nvarchar(500)',
    @Salon = @Salon,
    @DescSalon = @DescSalon;

DECLARE @fixPalapa nvarchar(max) = N'
UPDATE vts.AreasComunes
SET DescripcionAreasComunes = @DescPalapa
WHERE bEliminado = 0
  AND ' + QUOTENAME(@ColAreaNombre) + N' = N''Palapa''
  AND DescripcionAreasComunes COLLATE Latin1_General_BIN LIKE N''%Ã%'';';

EXEC sp_executesql @fixPalapa,
    N'@DescPalapa nvarchar(500)',
    @DescPalapa = @DescPalapa;

UPDATE m
SET TituloMenu = NCHAR(193) + N'reas Comunes'
FROM sgr.Menus m
WHERE m.bEliminado = 0 AND m.Ruta = N'/areas-comunes'
  AND m.TituloMenu COLLATE Latin1_General_BIN LIKE N'%Ã%';

UPDATE m
SET TituloMenu = NCHAR(193) + N'reas y reservas'
FROM sgr.Menus m
WHERE m.bEliminado = 0 AND m.Ruta = N'/admin/areas-reservas'
  AND m.TituloMenu COLLATE Latin1_General_BIN LIKE N'%Ã%';

-- Verificacion rapida (columna de nombre de perfil segun legacy / DB-001)
DECLARE @ver nvarchar(max) = N'
SELECT N''PerfilMenus VTS'' AS CheckId,
       p.' + QUOTENAME(@PerfilCol) + N' AS Perfil,
       m.TituloMenu,
       m.Ruta,
       pm.bVisible
FROM sgr.PerfilMenus pm
INNER JOIN sgr.Menus m ON m.MenuID = pm.MenuID AND m.bEliminado = 0
INNER JOIN sgr.Perfiles p ON p.PerfilID = pm.PerfilID AND p.bEliminado = 0
WHERE m.Ruta IN (N''/areas-comunes'', N''/admin/areas-reservas'')
  AND pm.bEliminado = 0
ORDER BY p.PerfilID, m.Orden;';

EXEC sp_executesql @ver;

GO
