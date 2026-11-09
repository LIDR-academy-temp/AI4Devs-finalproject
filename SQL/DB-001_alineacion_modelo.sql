/*
  DB-001 — Alineación físico ↔ modelo (ADR-008, readme §3.2).
  Ejecutar después de cuartaquinientos_schema.sql (DB-000).
  sqlcmd -S <server> -d CuartaQuinientos -b -i SQL/DB-001_alineacion_modelo.sql
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() IN (N'master', N'model', N'msdb', N'tempdb')
BEGIN
    RAISERROR(N'Ejecutar sobre CuartaQuinientos, no en BD de sistema.', 16, 1);
    SET NOEXEC ON;
END
GO

-- sgr.Usuarios
IF COL_LENGTH(N'sgr.Usuarios', N'CorreoUsuario') IS NOT NULL
    EXEC sp_rename N'sgr.Usuarios.CorreoUsuario', N'Correo', N'COLUMN';
GO
IF COL_LENGTH(N'sgr.Usuarios', N'PasswordUsuario') IS NOT NULL
    EXEC sp_rename N'sgr.Usuarios.PasswordUsuario', N'PasswordHash', N'COLUMN';
GO
IF COL_LENGTH(N'sgr.Usuarios', N'NombreUsuario') IS NOT NULL
    EXEC sp_rename N'sgr.Usuarios.NombreUsuario', N'Nombre', N'COLUMN';
GO
IF COL_LENGTH(N'sgr.Usuarios', N'TelefonoUsuario') IS NOT NULL
    EXEC sp_rename N'sgr.Usuarios.TelefonoUsuario', N'Telefono', N'COLUMN';
GO
IF COL_LENGTH(N'sgr.Usuarios', N'bActivoUsuario') IS NOT NULL
    EXEC sp_rename N'sgr.Usuarios.bActivoUsuario', N'bActivo', N'COLUMN';
GO
IF COL_LENGTH(N'sgr.Usuarios', N'Preferencias') IS NULL
    ALTER TABLE sgr.Usuarios ADD Preferencias NVARCHAR(MAX) NULL;
GO

DECLARE @uq sysname;
SELECT @uq = k.name
FROM sys.key_constraints k
INNER JOIN sys.tables t ON t.object_id = k.parent_object_id
INNER JOIN sys.index_columns ic ON ic.object_id = k.parent_object_id AND ic.index_id = k.unique_index_id
INNER JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
WHERE t.object_id = OBJECT_ID(N'sgr.Usuarios')
  AND k.type = N'UQ'
  AND c.name IN (N'Correo', N'CorreoUsuario');
IF @uq IS NOT NULL
    EXEC(N'ALTER TABLE sgr.Usuarios DROP CONSTRAINT [' + @uq + N']');

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'sgr.Usuarios')
      AND name = N'UX_sgr_Usuarios_Correo_Activo')
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UX_sgr_Usuarios_Correo_Activo
        ON sgr.Usuarios (Correo)
        WHERE bEliminado = 0;
END
GO

-- sgr.Perfiles
IF COL_LENGTH(N'sgr.Perfiles', N'Perfil') IS NOT NULL AND COL_LENGTH(N'sgr.Perfiles', N'Nombre') IS NULL
    EXEC sp_rename N'sgr.Perfiles.Perfil', N'Nombre', N'COLUMN';
GO

-- sgr.Condominios
IF COL_LENGTH(N'sgr.Condominios', N'NombreCondominio') IS NOT NULL
    EXEC sp_rename N'sgr.Condominios.NombreCondominio', N'Nombre', N'COLUMN';
GO
IF COL_LENGTH(N'sgr.Condominios', N'DireccionCondominio') IS NOT NULL
    EXEC sp_rename N'sgr.Condominios.DireccionCondominio', N'Direccion', N'COLUMN';
GO

-- sgr.Casas
IF COL_LENGTH(N'sgr.Casas', N'DireccionCasa') IS NOT NULL
    EXEC sp_rename N'sgr.Casas.DireccionCasa', N'Direccion', N'COLUMN';
GO
IF COL_LENGTH(N'sgr.Casas', N'NumeroExtCasa') IS NOT NULL
    EXEC sp_rename N'sgr.Casas.NumeroExtCasa', N'Numero', N'COLUMN';
GO

-- fnz.Cuentas
IF COL_LENGTH(N'fnz.Cuentas', N'Cuenta') IS NOT NULL AND COL_LENGTH(N'fnz.Cuentas', N'Nombre') IS NULL
    EXEC sp_rename N'fnz.Cuentas.Cuenta', N'Nombre', N'COLUMN';
GO

-- fnz.Cuotas
IF COL_LENGTH(N'fnz.Cuotas', N'CuentaID') IS NULL
    ALTER TABLE fnz.Cuotas ADD CuentaID INT NULL
        CONSTRAINT FK_fnz_Cuotas_CuentaID FOREIGN KEY (CuentaID) REFERENCES fnz.Cuentas (CuentaID);
GO
IF COL_LENGTH(N'fnz.Cuotas', N'MontoPagado') IS NULL
    ALTER TABLE fnz.Cuotas ADD MontoPagado DECIMAL(18, 2) NULL;
GO
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'fnz.Cuotas')
      AND name = N'UX_fnz_Cuotas_Casa_Periodo')
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UX_fnz_Cuotas_Casa_Periodo
        ON fnz.Cuotas (CasaID, PeriodoInicio)
        WHERE bEliminado = 0 AND CasaID IS NOT NULL;
END
GO

-- tkt.CategoriasTicket
IF COL_LENGTH(N'tkt.CategoriasTicket', N'CategoriaTicket') IS NOT NULL
    EXEC sp_rename N'tkt.CategoriasTicket.CategoriaTicket', N'Categoria', N'COLUMN';
GO

-- tkt.Tickets
IF COL_LENGTH(N'tkt.Tickets', N'TituloTicket') IS NOT NULL
    EXEC sp_rename N'tkt.Tickets.TituloTicket', N'Titulo', N'COLUMN';
GO
IF COL_LENGTH(N'tkt.Tickets', N'DescripcionTicket') IS NOT NULL
    EXEC sp_rename N'tkt.Tickets.DescripcionTicket', N'Descripcion', N'COLUMN';
GO
IF COL_LENGTH(N'tkt.Tickets', N'CasaID') IS NULL
    ALTER TABLE tkt.Tickets ADD CasaID INT NULL
        CONSTRAINT FK_tkt_Tickets_CasaID FOREIGN KEY (CasaID) REFERENCES sgr.Casas (CasaID);
GO
IF COL_LENGTH(N'tkt.Tickets', N'FechaCreacion') IS NULL
    ALTER TABLE tkt.Tickets ADD FechaCreacion DATETIME NOT NULL
        CONSTRAINT DF_tkt_Tickets_FechaCreacion DEFAULT (SYSUTCDATETIME());
GO

-- PrioridadEstickets → PrioridadesTicket
IF OBJECT_ID(N'tkt.PrioridadEstickets', N'U') IS NOT NULL
   AND OBJECT_ID(N'tkt.PrioridadesTicket', N'U') IS NULL
    EXEC sp_rename N'tkt.PrioridadEstickets', N'PrioridadesTicket';
GO
IF COL_LENGTH(N'tkt.PrioridadesTicket', N'Orden') IS NULL
    ALTER TABLE tkt.PrioridadesTicket ADD Orden TINYINT NULL;
GO

-- ntf.TiposNotificacion
IF COL_LENGTH(N'ntf.TiposNotificacion', N'TipoNotiicfacion') IS NOT NULL
    EXEC sp_rename N'ntf.TiposNotificacion.TipoNotiicfacion', N'TipoNotificacion', N'COLUMN';
GO

-- usr.Mascotas
IF COL_LENGTH(N'usr.Mascotas', N'NombreMascota') IS NOT NULL
    EXEC sp_rename N'usr.Mascotas.NombreMascota', N'Nombre', N'COLUMN';
GO

IF COL_LENGTH(N'usr.Mascotas', N'Nombre') IS NOT NULL
BEGIN
    EXEC(N'
CREATE OR ALTER VIEW usr.vsMascotas AS
SELECT M.MascotaID,
       M.UsuarioID,
       U.Nombre AS NombreUsuario,
       U.Correo AS CorreoUsuario,
       M.Nombre AS NombreMascota,
       M.TipoMascotaID,
       TM.TipoMascota,
       M.RazaMascotaID,
       M.RazaLibre,
       COALESCE(M.RazaLibre, RM.RazaMascota) AS RazaMascota,
       M.FechaNacimiento,
       M.bEliminado
FROM usr.Mascotas M (NOLOCK)
LEFT JOIN sgr.Usuarios U (NOLOCK) ON U.UsuarioID = M.UsuarioID
LEFT JOIN usr.TiposMascota TM (NOLOCK) ON TM.TipoMascotaID = M.TipoMascotaID
LEFT JOIN usr.RazasMascota RM (NOLOCK) ON RM.RazaMascotaID = M.RazaMascotaID;
');
END
GO

-- vts.AreasComunes
IF COL_LENGTH(N'vts.AreasComunes', N'AreasComunesID') IS NOT NULL
    EXEC sp_rename N'vts.AreasComunes.AreasComunesID', N'AreaID', N'COLUMN';
GO
IF COL_LENGTH(N'vts.AreasComunes', N'AreasComunes') IS NOT NULL
    EXEC sp_rename N'vts.AreasComunes.AreasComunes', N'Nombre', N'COLUMN';
GO
IF COL_LENGTH(N'vts.ReservacionesArea', N'AreasComunesID') IS NOT NULL
    EXEC sp_rename N'vts.ReservacionesArea.AreasComunesID', N'AreaID', N'COLUMN';
GO

-- Vistas ampliadas (tickets / usuarios)
IF OBJECT_ID(N'tkt.CategoriasTicket', N'U') IS NOT NULL
   AND OBJECT_ID(N'tkt.CanalesTicket', N'U') IS NOT NULL
BEGIN
    EXEC(N'
CREATE OR ALTER VIEW tkt.vsTickets AS
SELECT T.TicketID,
       T.Titulo,
       T.Descripcion,
       T.UsuarioSolicitanteID,
       USol.Nombre AS NombreSolicitante,
       T.PrioridadTicketID,
       P.PrioridadTicket,
       T.EstadoTicketID,
       E.EstadoTicket,
       T.CategoriaTicketID,
       C.Categoria AS Categoria,
       T.CanalID,
       CT.Canal AS Canal,
       T.CasaID,
       T.FechaCreacionTicket,
       T.FechaCierre,
       T.bEliminado
FROM tkt.Tickets T WITH (NOLOCK)
INNER JOIN sgr.Usuarios USol WITH (NOLOCK) ON USol.UsuarioID = T.UsuarioSolicitanteID
INNER JOIN tkt.PrioridadesTicket P WITH (NOLOCK) ON P.PrioridadTicketID = T.PrioridadTicketID
INNER JOIN tkt.EstadosTickets E WITH (NOLOCK) ON E.EstadoTicketID = T.EstadoTicketID
LEFT JOIN tkt.CategoriasTicket C WITH (NOLOCK) ON C.CategoriaTicketID = T.CategoriaTicketID
LEFT JOIN tkt.CanalesTicket CT WITH (NOLOCK) ON CT.CanalID = T.CanalID;
');
    PRINT N'tkt.vsTickets (modelo extendido con categoría/canal).';
END
ELSE
BEGIN
    DECLARE @tituloExpr nvarchar(200) =
        CASE WHEN COL_LENGTH(N'tkt.Tickets', N'Titulo') IS NOT NULL
             THEN N'T.Titulo AS TituloTicket'
             ELSE N'T.TituloTicket AS TituloTicket' END;
    DECLARE @descExpr nvarchar(200) =
        CASE WHEN COL_LENGTH(N'tkt.Tickets', N'Descripcion') IS NOT NULL
             THEN N'T.Descripcion AS DescripcionTicket'
             ELSE N'T.DescripcionTicket AS DescripcionTicket' END;
    DECLARE @sqlLegacy nvarchar(max) = N'
CREATE OR ALTER VIEW tkt.vsTickets AS
SELECT T.TicketID,
       ' + @tituloExpr + N',
       ' + @descExpr + N',
       T.UsuarioSolicitanteID,
       USol.Nombre AS NombreSolicitante,
       T.PrioridadTicketID,
       P.PrioridadTicket,
       T.EstadoTicketID,
       E.EstadoTicket,
       T.FechaCreacionTicket,
       T.FechaCierre,
       T.bEliminado
FROM tkt.Tickets T WITH (NOLOCK)
INNER JOIN sgr.Usuarios USol WITH (NOLOCK) ON USol.UsuarioID = T.UsuarioSolicitanteID
INNER JOIN tkt.PrioridadesTicket P WITH (NOLOCK) ON P.PrioridadTicketID = T.PrioridadTicketID
INNER JOIN tkt.EstadosTickets E WITH (NOLOCK) ON E.EstadoTicketID = T.EstadoTicketID;';
    EXEC sp_executesql @sqlLegacy;
    PRINT N'tkt.vsTickets (legacy sin tkt.CategoriasTicket — omitiendo JOIN catálogo).';
END
GO

CREATE OR ALTER VIEW sgr.vsUsuarios AS
SELECT u.UsuarioID,
       u.Correo,
       u.Nombre,
       u.Telefono,
       u.bActivo,
       u.PerfilID,
       p.Nombre AS Perfil,
       p.bAdministrador,
       co.CasaID,
       ca.Numero,
       ca.CondominioID,
       cond.Nombre AS Condominio,
       u.bEliminado
FROM sgr.Usuarios u WITH (NOLOCK)
INNER JOIN sgr.Perfiles p WITH (NOLOCK) ON p.PerfilID = u.PerfilID
OUTER APPLY (
    SELECT TOP (1) o.CasaID
    FROM sgr.CasaOcupantes o WITH (NOLOCK)
    WHERE o.UsuarioID = u.UsuarioID AND o.Vigente = 1 AND o.bEliminado = 0
    ORDER BY o.CasaOcupanteID
) co
LEFT JOIN sgr.Casas ca WITH (NOLOCK) ON ca.CasaID = co.CasaID AND ca.bEliminado = 0
LEFT JOIN sgr.Condominios cond WITH (NOLOCK) ON cond.CondominioID = ca.CondominioID AND cond.bEliminado = 0;
GO

IF COL_LENGTH(N'tkt.Tickets', N'CategoriaTicketID') IS NOT NULL
BEGIN
    DECLARE @tituloAsign nvarchar(200) =
        CASE WHEN COL_LENGTH(N'tkt.Tickets', N'Titulo') IS NOT NULL
             THEN N'T.Titulo'
             ELSE N'T.TituloTicket AS Titulo' END;
    DECLARE @catCol nvarchar(200) =
        N'T.CategoriaTicketID,';
    DECLARE @casaCol nvarchar(200) = N'';
    IF COL_LENGTH(N'tkt.Tickets', N'CasaID') IS NOT NULL
        SET @casaCol = N'T.CasaID,';
    DECLARE @ordenCol nvarchar(200) = N'';
    IF COL_LENGTH(N'tkt.PrioridadesTicket', N'Orden') IS NOT NULL
        SET @ordenCol = N'P.Orden AS OrdenPrioridad,';
    DECLARE @sqlAsignExt nvarchar(max) = N'
CREATE OR ALTER VIEW tkt.vsTicketsUsuariosAsignados AS
SELECT TUA.TicketsUsuariosAsignadosID,
       TUA.TicketID,
       ' + @tituloAsign + N',
       TUA.UsuarioID,
       U.Nombre AS UsuarioAsignado,
       T.PrioridadTicketID,
       P.PrioridadTicket,
       ' + @ordenCol + N'
       T.EstadoTicketID,
       E.EstadoTicket,
       ' + @catCol + N'
       ' + @casaCol + N'
       T.FechaCreacionTicket,
       TUA.Terminado,
       TUA.bEliminado
FROM tkt.TicketsUsuariosAsignados TUA WITH (NOLOCK)
INNER JOIN tkt.Tickets T WITH (NOLOCK) ON T.TicketID = TUA.TicketID
INNER JOIN sgr.Usuarios U WITH (NOLOCK) ON U.UsuarioID = TUA.UsuarioID
INNER JOIN tkt.PrioridadesTicket P WITH (NOLOCK) ON P.PrioridadTicketID = T.PrioridadTicketID
INNER JOIN tkt.EstadosTickets E WITH (NOLOCK) ON E.EstadoTicketID = T.EstadoTicketID;';
    EXEC sp_executesql @sqlAsignExt;
    PRINT N'tkt.vsTicketsUsuariosAsignados (extendido).';
END
ELSE
BEGIN
    DECLARE @tituloAsignLegacy nvarchar(200) =
        CASE WHEN COL_LENGTH(N'tkt.Tickets', N'Titulo') IS NOT NULL
             THEN N'T.Titulo AS TituloTicket'
             ELSE N'T.TituloTicket AS TituloTicket' END;
    DECLARE @sqlAsignLegacy nvarchar(max) = N'
CREATE OR ALTER VIEW tkt.vsTicketsUsuariosAsignados AS
SELECT TUA.TicketsUsuariosAsignadosID,
       TUA.TicketID,
       ' + @tituloAsignLegacy + N',
       TUA.UsuarioID,
       U.Nombre AS UsuarioAsignado,
       TUA.Terminado,
       TUA.bEliminado
FROM tkt.TicketsUsuariosAsignados TUA WITH (NOLOCK)
INNER JOIN tkt.Tickets T WITH (NOLOCK) ON T.TicketID = TUA.TicketID
INNER JOIN sgr.Usuarios U WITH (NOLOCK) ON U.UsuarioID = TUA.UsuarioID;';
    EXEC sp_executesql @sqlAsignLegacy;
    PRINT N'tkt.vsTicketsUsuariosAsignados (legacy sin CategoriaTicketID).';
END
GO

PRINT N'DB-001 completado.';
GO
