/*
  DB-002 — Catálogos y administrador inicial (idempotente).
  Requiere DB-001 aplicado (nombres lógicos ADR-008).
  sqlcmd -S <server> -d CuartaQuinientos -i SQL/DB-002_seeds_catalogos.sql ^
    -v AdminCorreo="admin@local" AdminPasswordHash="$2a$10$..." Demo=0
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF COL_LENGTH(N'sgr.Usuarios', N'Correo') IS NULL
BEGIN
    RAISERROR(N'Ejecutar DB-001 antes de DB-002 (columna sgr.Usuarios.Correo).', 16, 1);
    RETURN;
END;

IF N'$(AdminCorreo)' = N'' OR N'$(AdminPasswordHash)' = N''
BEGIN
    RAISERROR(N'AdminCorreo y AdminPasswordHash son obligatorios (variables sqlcmd).', 16, 1);
    RETURN;
END;

DECLARE @Now datetime = SYSUTCDATETIME();
DECLARE @ByCorreo nvarchar(100) = N'$(AdminCorreo)';
DECLARE @AdminHash nvarchar(500) = N'$(AdminPasswordHash)';
DECLARE @ActorId int;

BEGIN TRAN;

IF NOT EXISTS (SELECT 1 FROM sgr.Usuarios WITH (UPDLOCK, HOLDLOCK))
BEGIN
    SET IDENTITY_INSERT sgr.Usuarios ON;
    INSERT INTO sgr.Usuarios (
        UsuarioID, Correo, PerfilID, PasswordHash, Nombre,
        bActivo, Creado, UsuarioCreacionID, FechaCreacion, bEliminado, bActualizarPassword)
    VALUES (
        1, N'bootstrap@cuartaquinientos.local', NULL, @AdminHash, N'System Bootstrap',
        0, @ByCorreo, 1, @Now, 0, 0);
    SET IDENTITY_INSERT sgr.Usuarios OFF;
END;

SELECT @ActorId = MIN(UsuarioID) FROM sgr.Usuarios;

MERGE sgr.Perfiles AS t
USING (VALUES
    (N'Administrador', 1),
    (N'Residente', 0),
    (N'Guardia', 0),
    (N'Trabajador', 0)
) AS s (Nombre, bAdministrador)
ON t.Nombre = s.Nombre AND t.bEliminado = 0
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Nombre, Descripcion, bAdministrador, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
    VALUES (s.Nombre, NULL, s.bAdministrador, @ByCorreo, @ActorId, @Now, 0)
WHEN MATCHED AND t.bAdministrador <> s.bAdministrador THEN
    UPDATE SET bAdministrador = s.bAdministrador, Modificado = @ByCorreo, UsuarioModificacionID = @ActorId, FechaModificacion = @Now;

DECLARE @PerfilAdminId int = (SELECT PerfilID FROM sgr.Perfiles WHERE Nombre = N'Administrador' AND bEliminado = 0);

MERGE tkt.EstadosTickets AS t
USING (VALUES
    (N'Nuevo'), (N'En seguimiento'), (N'Resuelto'), (N'Cerrado')
) AS s (EstadoTicket)
ON t.EstadoTicket = s.EstadoTicket AND t.bEliminado = 0
WHEN NOT MATCHED BY TARGET THEN
    INSERT (EstadoTicket, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
    VALUES (s.EstadoTicket, @ByCorreo, @ActorId, @Now, 0);

MERGE tkt.PrioridadesTicket AS t
USING (VALUES
    (N'Baja', 1), (N'Media', 2), (N'Alta', 3), (N'Crítica', 4)
) AS s (PrioridadTicket, Orden)
ON t.PrioridadTicket = s.PrioridadTicket AND t.bEliminado = 0
WHEN NOT MATCHED BY TARGET THEN
    INSERT (PrioridadTicket, Orden, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
    VALUES (s.PrioridadTicket, s.Orden, @ByCorreo, @ActorId, @Now, 0)
WHEN MATCHED AND (t.Orden IS NULL OR t.Orden <> s.Orden) THEN
    UPDATE SET Orden = s.Orden, Modificado = @ByCorreo, UsuarioModificacionID = @ActorId, FechaModificacion = @Now;

MERGE tkt.CategoriasTicket AS t
USING (VALUES
    (N'Agua'), (N'Electricidad'), (N'Jardinería'), (N'Seguridad'), (N'Limpieza'), (N'Otro')
) AS s (Categoria)
ON t.Categoria = s.Categoria AND t.bEliminado = 0
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Categoria, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
    VALUES (s.Categoria, @ByCorreo, @ActorId, @Now, 0);

MERGE tkt.CanalesTicket AS t
USING (VALUES (N'WEB'), (N'TELEGRAM')) AS s (Canal)
ON t.Canal = s.Canal AND t.bEliminado = 0
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Canal, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
    VALUES (s.Canal, @ByCorreo, @ActorId, @Now, 0);

MERGE ntf.TiposNotificacion AS t
USING (VALUES
    (N'TICKET_NUEVO'), (N'TICKET_ESTADO'), (N'TICKET_ASIGNADO'), (N'PAGO_REGISTRADO'),
    (N'CUOTA_VENCIDA'), (N'ENCUESTA_PUBLICADA'), (N'JUNTA_CONVOCADA'),
    (N'RESERVA_CONFIRMADA'), (N'AVISO_GENERAL')
) AS s (TipoNotificacion)
ON t.TipoNotificacion = s.TipoNotificacion AND t.bEliminado = 0
WHEN NOT MATCHED BY TARGET THEN
    INSERT (TipoNotificacion, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
    VALUES (s.TipoNotificacion, @ByCorreo, @ActorId, @Now, 0);

MERGE fnz.TiposMovimiento AS t
USING (VALUES
    (N'Pago de cuota', 0, 1),
    (N'Gasto', 1, 0)
) AS s (TipoMovimiento, bCargo, bAbono)
ON t.TipoMovimiento = s.TipoMovimiento AND t.bEliminado = 0
WHEN NOT MATCHED BY TARGET THEN
    INSERT (TipoMovimiento, bCargo, bAbono, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
    VALUES (s.TipoMovimiento, s.bCargo, s.bAbono, @ByCorreo, @ActorId, @Now, 0);

MERGE fnz.Cuentas AS t
USING (SELECT N'Cuenta de mantenimiento' AS Nombre, N'MANTENIMIENTO' AS Tipo) AS s
ON t.Nombre = s.Nombre AND t.bEliminado = 0
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Nombre, Tipo, Saldo, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
    VALUES (s.Nombre, s.Tipo, 0, @ByCorreo, @ActorId, @Now, 0);

MERGE sgr.Condominios AS t
USING (SELECT N'Cuarta Quinientos' AS Nombre, N'Por configurar' AS Direccion) AS s
ON t.Nombre = s.Nombre AND t.bEliminado = 0
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Nombre, Direccion, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
    VALUES (s.Nombre, s.Direccion, @ByCorreo, @ActorId, @Now, 0);

MERGE sgr.Usuarios AS t
USING (SELECT @ByCorreo AS Correo, @AdminHash AS PasswordHash, N'Administrador inicial' AS Nombre) AS s
ON t.Correo = s.Correo AND t.bEliminado = 0
WHEN MATCHED THEN
    UPDATE SET
        PasswordHash = s.PasswordHash,
        PerfilID = @PerfilAdminId,
        Nombre = s.Nombre,
        bActivo = 1,
        bActualizarPassword = 1,
        Modificado = @ByCorreo,
        UsuarioModificacionID = @ActorId,
        FechaModificacion = @Now
WHEN NOT MATCHED BY TARGET THEN
    INSERT (
        Correo, PerfilID, PasswordHash, Nombre, bActivo,
        Creado, UsuarioCreacionID, FechaCreacion, bEliminado, bActualizarPassword)
    VALUES (
        s.Correo, @PerfilAdminId, s.PasswordHash, s.Nombre, 1,
        @ByCorreo, @ActorId, @Now, 0, 1);

IF N'$(Demo)' = N'1'
BEGIN
    RAISERROR(N'Demo=1: bloque de datos ficticios pendiente (CA-7). Catálogos y admin ya aplicados.', 0, 1) WITH NOWAIT;
END;

COMMIT TRAN;

PRINT N'DB-002 completado.';
