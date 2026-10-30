-- Catálogos mínimos FNZ para registrar pago de cuota (PATCH /FNZ/Cuotas/{id}/pago)
SET NOCOUNT ON;

DECLARE @ByCorreo NVARCHAR(100) = N'sistema@local';
DECLARE @ActorId INT = 1;
DECLARE @Now DATETIME = GETDATE();

IF OBJECT_ID(N'fnz.TiposMovimiento', N'U') IS NOT NULL
BEGIN
    MERGE fnz.TiposMovimiento AS t
    USING (VALUES
        (N'Pago de cuota', 0, 1),
        (N'Gasto', 1, 0)
    ) AS s (TipoMovimiento, bCargo, bAbono)
    ON t.TipoMovimiento = s.TipoMovimiento AND t.bEliminado = 0
    WHEN NOT MATCHED BY TARGET THEN
        INSERT (TipoMovimiento, bCargo, bAbono, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
        VALUES (s.TipoMovimiento, s.bCargo, s.bAbono, @ByCorreo, @ActorId, @Now, 0);
END
ELSE
    PRINT N'AVISO: fnz.TiposMovimiento no existe; aplique DB-001 antes.';

IF OBJECT_ID(N'ntf.TiposNotificacion', N'U') IS NOT NULL
BEGIN
    MERGE ntf.TiposNotificacion AS t
    USING (SELECT N'PAGO_REGISTRADO' AS TipoNotificacion) AS s
    ON t.TipoNotificacion = s.TipoNotificacion AND t.bEliminado = 0
    WHEN NOT MATCHED BY TARGET THEN
        INSERT (TipoNotificacion, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
        VALUES (s.TipoNotificacion, @ByCorreo, @ActorId, @Now, 0);
END

PRINT N'20261029_fnz_pago_cuota_catalog aplicado.';
