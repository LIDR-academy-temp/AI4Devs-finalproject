-- Catálogo de tipos para fnz.Cuentas.Tipo (admin CRUD)
SET NOCOUNT ON;

IF OBJECT_ID(N'fnz.TiposCuenta', N'U') IS NULL
BEGIN
    CREATE TABLE fnz.TiposCuenta (
        TipoCuentaID            INT             IDENTITY(1, 1) NOT NULL,
        Nombre                  NVARCHAR(50)    NOT NULL,
        Descripcion             NVARCHAR(200)   NULL,
        Creado                  NVARCHAR(100)   NOT NULL,
        Modificado              NVARCHAR(100)   NULL,
        UsuarioCreacionID       INT             NOT NULL,
        UsuarioModificacionID   INT             NULL,
        FechaCreacion           DATETIME        NOT NULL CONSTRAINT DF_fnz_TiposCuenta_FechaCreacion DEFAULT (GETDATE()),
        FechaModificacion       DATETIME        NULL,
        bEliminado              BIT             NOT NULL CONSTRAINT DF_fnz_TiposCuenta_bEliminado DEFAULT (0),
        CONSTRAINT pk_fnz_TiposCuenta PRIMARY KEY CLUSTERED (TipoCuentaID ASC)
    );

    CREATE UNIQUE NONCLUSTERED INDEX UX_fnz_TiposCuenta_Nombre
        ON fnz.TiposCuenta (Nombre)
        WHERE bEliminado = 0;
END
GO

DECLARE @ByCorreo NVARCHAR(100) = N'sistema@local';
DECLARE @ActorId INT = 1;

MERGE fnz.TiposCuenta AS t
USING (VALUES
    (N'MANTENIMIENTO', N'Cuotas y gastos de mantenimiento'),
    (N'INGRESOS', N'Ingresos generales'),
    (N'GASTOS', N'Egresos operativos')
) AS s (Nombre, Descripcion)
ON t.Nombre = s.Nombre AND t.bEliminado = 0
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Nombre, Descripcion, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
    VALUES (s.Nombre, s.Descripcion, @ByCorreo, @ActorId, GETDATE(), 0);

PRINT N'20261029_fnz_tipos_cuenta_catalog aplicado.';
