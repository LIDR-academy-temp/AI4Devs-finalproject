-- ============================================================
-- DB-009  Fix vistas y tablas en producción (v2 – sin CASE WHEN)
-- Autor   : Claude (sesión AI4Devs)
-- Fecha   : 2026-10-29
-- Propósito:
--   1. Crear sgr.RefreshTokens si no existe (login fallaba).
--   2. Recrear TODAS las vistas usando los nombres de columna
--      actuales en producción (post DB-001):
--        sgr.Usuarios  → Nombre / Correo / bActivo / Password /
--                        Telefono / FotoUrl
--        sgr.Casas     → Direccion / Numero
--        sgr.Perfiles  → Nombre (nunca se renombró a Perfil)
--      Los alias de salida se mantienen con los nombres
--      "antiguos" para no romper el código C# que aún los usa.
-- ============================================================
-- INSTRUCCIONES DE EJECUCIÓN
--   1. Ejecutar en la base de datos de producción ANTES del
--      próximo despliegue de la API.
--   2. No requiere ventana de mantenimiento.
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 1. sgr.RefreshTokens  (tabla faltante → login roto)
-- ──────────────────────────────────────────────────────────
IF OBJECT_ID(N'sgr.RefreshTokens', N'U') IS NULL
BEGIN
    CREATE TABLE [sgr].[RefreshTokens] (
        [TokenID]               int           IDENTITY(1,1) NOT NULL,
        [UsuarioID]             int           NOT NULL,
        [Token]                 nvarchar(500) NOT NULL,
        [FechaExpira]           datetime      NOT NULL,
        [Revocado]              bit           NOT NULL DEFAULT ((0)),
        [Creado]                nvarchar(100) NOT NULL,
        [Modificado]            nvarchar(100) NULL,
        [UsuarioCreacionID]     int           NOT NULL,
        [UsuarioModificacionID] int           NULL,
        [FechaCreacion]         datetime      NOT NULL,
        [FechaModificacion]     datetime      NULL,
        [bEliminado]            bit           NOT NULL DEFAULT ((0)),
        CONSTRAINT [pk_sgr_RefreshTokens]
            PRIMARY KEY CLUSTERED ([TokenID] ASC),
        CONSTRAINT [FK_sgr_RefreshTokens_UsuarioID]
            FOREIGN KEY ([UsuarioID]) REFERENCES [sgr].[Usuarios] ([UsuarioID])
    );
    PRINT 'sgr.RefreshTokens creada.';
END
ELSE
    PRINT 'sgr.RefreshTokens ya existe, sin cambios.';
GO

-- Índice único en Token (solo si no existe)
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'sgr.RefreshTokens')
      AND name = N'UX_sgr_RefreshTokens_Token')
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [UX_sgr_RefreshTokens_Token]
        ON [sgr].[RefreshTokens] ([Token])
        WHERE [bEliminado] = 0 AND [Revocado] = 0;
    PRINT 'Índice UX_sgr_RefreshTokens_Token creado.';
END
GO

-- ──────────────────────────────────────────────────────────
-- 2. usr.vsMascotas
-- ──────────────────────────────────────────────────────────
CREATE OR ALTER VIEW usr.vsMascotas AS
SELECT M.MascotaID,
       M.UsuarioID,
       U.Nombre          AS NombreUsuario,
       U.Correo          AS CorreoUsuario,
       M.Nombre          AS NombreMascota,
       M.TipoMascotaID,
       TM.TipoMascota,
       M.RazaMascotaID,
       M.RazaLibre,
       COALESCE(M.RazaLibre, RM.RazaMascota) AS RazaMascota,
       M.FechaNacimiento,
       M.bEliminado
FROM usr.Mascotas M WITH (NOLOCK)
LEFT JOIN sgr.Usuarios U WITH (NOLOCK) ON U.UsuarioID = M.UsuarioID
LEFT JOIN usr.TiposMascota TM WITH (NOLOCK) ON TM.TipoMascotaID = M.TipoMascotaID
LEFT JOIN usr.RazasMascota RM WITH (NOLOCK) ON RM.RazaMascotaID = M.RazaMascotaID;
GO

-- ──────────────────────────────────────────────────────────
-- 3. usr.vsAutomoviles
-- ──────────────────────────────────────────────────────────
CREATE OR ALTER VIEW usr.vsAutomoviles AS
SELECT A.AutomovilID,
       A.UsuarioID,
       U.Nombre          AS NombreUsuario,
       U.Correo          AS CorreoUsuario,
       A.MarcaID,
       Ma.Marca,
       A.ModeloID,
       A.ModeloLibre,
       COALESCE(A.ModeloLibre, Mo.Modelo) AS Modelo,
       A.Placas,
       A.Color,
       A.bEliminado
FROM usr.Automoviles A WITH (NOLOCK)
LEFT JOIN sgr.Usuarios U WITH (NOLOCK) ON U.UsuarioID = A.UsuarioID
LEFT JOIN usr.Marcas Ma WITH (NOLOCK) ON Ma.MarcaID = A.MarcaID
LEFT JOIN usr.Modelos Mo WITH (NOLOCK) ON Mo.ModeloID = A.ModeloID;
GO

-- ──────────────────────────────────────────────────────────
-- 4. sgr.vsCasas
-- ──────────────────────────────────────────────────────────
CREATE OR ALTER VIEW sgr.vsCasas AS
SELECT ca.CasaID,
       ca.CondominioID,
       C.Nombre          AS NombreCondominio,
       C.Direccion       AS DireccionCondominio,
       ca.Direccion      AS DireccionCasa,
       ca.Numero         AS NumeroExtCasa,
       ca.PropietarioUsuarioID,
       U.Nombre          AS NombrePropietario,
       U.Correo          AS CorreoPropietario,
       U.FotoUrlUsuario  AS FotoUrlPropietario,
       U.Telefono        AS TelefonoPropietario,
       ca.bEliminado
FROM sgr.Casas ca WITH (NOLOCK)
INNER JOIN sgr.Condominios C WITH (NOLOCK) ON C.CondominioID = ca.CondominioID
INNER JOIN sgr.Usuarios U WITH (NOLOCK) ON U.UsuarioID = ca.PropietarioUsuarioID;
GO

-- ──────────────────────────────────────────────────────────
-- 5. sgr.vsUsuarios
-- ──────────────────────────────────────────────────────────
CREATE OR ALTER VIEW sgr.vsUsuarios AS
SELECT U.UsuarioID,
       U.Correo          AS CorreoUsuario,
       U.PerfilID,
       P.Nombre          AS Perfil,
       P.bAdministrador,
       U.PasswordHash    AS PasswordUsuario,
       U.Nombre          AS NombreUsuario,
       U.Telefono        AS TelefonoUsuario,
       U.FotoUrlUsuario  AS FotoUrlUsuario,
       U.bActivo         AS bActivoUsuario,
       U.bEliminado,
       U.bActualizarPassword
FROM sgr.Usuarios U WITH (NOLOCK)
INNER JOIN sgr.Perfiles P WITH (NOLOCK) ON P.PerfilID = U.PerfilID;
GO

-- ──────────────────────────────────────────────────────────
-- 6. sgr.vsPerfiles
-- ──────────────────────────────────────────────────────────
CREATE OR ALTER VIEW sgr.vsPerfiles AS
SELECT P.PerfilID,
       P.Nombre          AS Perfil,
       P.Descripcion,
       P.bAdministrador,
       P.bEliminado,
       COUNT(U.UsuarioID) AS UsuariosAsignados
FROM sgr.Perfiles P WITH (NOLOCK)
LEFT JOIN sgr.Usuarios U WITH (NOLOCK)
    ON U.PerfilID = P.PerfilID AND ISNULL(U.bEliminado, 0) = 0
GROUP BY P.PerfilID, P.Nombre, P.Descripcion, P.bAdministrador, P.bEliminado;
GO

-- ──────────────────────────────────────────────────────────
-- 7. sgr.vsPerfilMenus
-- ──────────────────────────────────────────────────────────
CREATE OR ALTER VIEW sgr.vsPerfilMenus AS
SELECT PM.PerfilMenuID,
       PM.PerfilID,
       Per.Nombre        AS Perfil,
       PM.MenuID,
       M.TituloMenu,
       M.Icono,
       M.Ruta,
       M.Orden,
       M.PadreMenuID,
       PM.bVisible,
       PM.bEliminado
FROM sgr.PerfilMenus PM WITH (NOLOCK)
INNER JOIN sgr.Perfiles Per WITH (NOLOCK) ON Per.PerfilID = PM.PerfilID
INNER JOIN sgr.Menus M WITH (NOLOCK) ON M.MenuID = PM.MenuID;
GO

-- ──────────────────────────────────────────────────────────
-- 8. sgr.vsPerfilMenuBotones
-- ──────────────────────────────────────────────────────────
CREATE OR ALTER VIEW sgr.vsPerfilMenuBotones AS
SELECT PMB.PerfilMenuBotonID,
       PMB.PerfilID,
       P.Nombre          AS Perfil,
       PMB.MenuBotonID,
       MB.Boton,
       MB.Accion,
       MB.MenuID,
       M.TituloMenu,
       PMB.bActivo,
       PMB.bEliminado
FROM sgr.PerfilMenuBotones PMB WITH (NOLOCK)
INNER JOIN sgr.Perfiles P WITH (NOLOCK) ON P.PerfilID = PMB.PerfilID
INNER JOIN sgr.MenusBotones MB WITH (NOLOCK) ON MB.MenuBotonID = PMB.MenuBotonID
INNER JOIN sgr.Menus M WITH (NOLOCK) ON M.MenuID = MB.MenuID;
GO

-- ──────────────────────────────────────────────────────────
-- 9. usr.vsParientes
-- ──────────────────────────────────────────────────────────
CREATE OR ALTER VIEW usr.vsParientes AS
SELECT P.ParienteID,
       P.UsuarioID,
       U.Nombre          AS NombreUsuario,
       U.Correo          AS CorreoUsuario,
       P.NombrePariente,
       P.ParentescoID,
       Pa.Parentesco,
       P.TelefonoPariente,
       P.CorreoPariente,
       P.EsContactoEmergencia,
       P.bEliminado
FROM usr.Parientes P WITH (NOLOCK)
INNER JOIN sgr.Usuarios U WITH (NOLOCK) ON U.UsuarioID = P.UsuarioID
INNER JOIN usr.Parentescos Pa WITH (NOLOCK) ON Pa.ParentescoID = P.ParentescoID;
GO

-- ──────────────────────────────────────────────────────────
-- 10. vts.vsReservacionesArea
-- ──────────────────────────────────────────────────────────
CREATE OR ALTER VIEW vts.vsReservacionesArea AS
SELECT R.ReservacionAreaID,
       R.AreaID          AS AreasComunesID,
       AC.Nombre         AS AreasComunes,
       AC.Capacidad,
       AC.RequiereReservacion,
       R.UsuarioID,
       U.Nombre          AS NombreUsuario,
       U.Correo          AS CorreoUsuario,
       R.FechaInicio,
       R.FechaFin,
       R.ReservacionEstadoID,
       E.ReservacionEstado,
       R.bEliminado
FROM vts.ReservacionesArea R WITH (NOLOCK)
INNER JOIN vts.AreasComunes AC WITH (NOLOCK) ON AC.AreaID = R.AreaID
INNER JOIN sgr.Usuarios U WITH (NOLOCK) ON U.UsuarioID = R.UsuarioID
INNER JOIN vts.ReservacionesEstados E WITH (NOLOCK) ON E.ReservacionEstadoID = R.ReservacionEstadoID;
GO

-- ──────────────────────────────────────────────────────────
-- 11. vts.vsVisitasGeneradas
-- ──────────────────────────────────────────────────────────
CREATE OR ALTER VIEW vts.vsVisitasGeneradas AS
SELECT V.VisitaGeneradaID,
       V.NombreVisitante,
       V.UsuarioVisitadoID,
       U.Nombre          AS NombreVisitado,
       U.Correo          AS CorreoVisitado,
       V.CasaID,
       C.Direccion       AS DireccionCasa,
       C.Numero          AS NumeroExtCasa,
       V.TipoIdentificacionID,
       TI.TipoIdentificacion,
       V.NumeroIdentificacion,
       V.RutaDocumento,
       V.CodigoQR,
       V.FechaEmision,
       V.FechaExpira,
       V.bUsado,
       V.bEliminado
FROM vts.VisitasGeneradas V WITH (NOLOCK)
INNER JOIN sgr.Usuarios U WITH (NOLOCK) ON U.UsuarioID = V.UsuarioVisitadoID
INNER JOIN sgr.Casas C WITH (NOLOCK) ON C.CasaID = V.CasaID
INNER JOIN vts.TipoIdentificacion TI WITH (NOLOCK) ON TI.TipoIdentificacionID = V.TipoIdentificacionID;
GO

-- ──────────────────────────────────────────────────────────
-- 12. fnz.vsTransacciones
-- ──────────────────────────────────────────────────────────
CREATE OR ALTER VIEW fnz.vsTransacciones AS
SELECT T.TransaccionID,
       T.CuentaID,
       C.Nombre          AS Cuenta,
       C.Tipo            AS TipoCuenta,
       T.UsuarioID,
       U.Nombre          AS NombreUsuario,
       T.TipoMovimientoID,
       TM.TipoMovimiento,
       T.Cargo,
       T.Abono,
       T.Motivo,
       T.bEliminado
FROM fnz.Transacciones T WITH (NOLOCK)
INNER JOIN fnz.Cuentas C WITH (NOLOCK) ON C.CuentaID = T.CuentaID
INNER JOIN sgr.Usuarios U WITH (NOLOCK) ON U.UsuarioID = T.UsuarioID
INNER JOIN fnz.TiposMovimiento TM WITH (NOLOCK) ON TM.TipoMovimientoID = T.TipoMovimientoID;
GO

-- ──────────────────────────────────────────────────────────
-- 13. tkt.vsTickets
-- ──────────────────────────────────────────────────────────
CREATE OR ALTER VIEW tkt.vsTickets AS
SELECT T.TicketID,
       T.Titulo          AS TituloTicket,
       T.Descripcion     AS DescripcionTicket,
       T.UsuarioSolicitanteID,
       USol.Nombre       AS NombreSolicitante,
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
INNER JOIN tkt.EstadosTickets E WITH (NOLOCK) ON E.EstadoTicketID = T.EstadoTicketID;
GO

-- ──────────────────────────────────────────────────────────
-- 14. tkt.vsTicketsUsuariosAsignados
-- ──────────────────────────────────────────────────────────
CREATE OR ALTER VIEW tkt.vsTicketsUsuariosAsignados AS
SELECT TUA.TicketsUsuariosAsignadosID,
       TUA.TicketID,
       T.Titulo          AS TituloTicket,
       TUA.UsuarioID,
       U.Nombre          AS UsuarioAsignado,
       TUA.Terminado,
       TUA.bEliminado
FROM tkt.TicketsUsuariosAsignados TUA WITH (NOLOCK)
INNER JOIN tkt.Tickets T WITH (NOLOCK) ON T.TicketID = TUA.TicketID
INNER JOIN sgr.Usuarios U WITH (NOLOCK) ON U.UsuarioID = TUA.UsuarioID;
GO

-- ──────────────────────────────────────────────────────────
-- 15. wms.vsPrestamos
-- ──────────────────────────────────────────────────────────
CREATE OR ALTER VIEW [wms].[vsPrestamos] AS
SELECT P.PrestamoID,
       P.ArticuloID,
       A.Nombre          AS ArticuloNombre,
       P.UsuarioID,
       U.Nombre          AS UsuarioNombre,
       P.Cantidad,
       P.FechaPrestamo,
       P.FechaDevolucion,
       P.Estado
FROM [wms].[Prestamos] AS P WITH (NOLOCK)
INNER JOIN [wms].[Articulos] AS A WITH (NOLOCK)
    ON A.ArticuloID = P.ArticuloID AND A.bEliminado = 0
INNER JOIN [sgr].[Usuarios] AS U WITH (NOLOCK)
    ON U.UsuarioID = P.UsuarioID AND U.bEliminado = 0
WHERE P.bEliminado = 0;
GO

PRINT '=== DB-009 v2 completado exitosamente ===';
GO
