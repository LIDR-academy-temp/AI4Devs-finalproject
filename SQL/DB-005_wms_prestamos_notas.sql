/*
  WMS — solo complemento (Notas / Prestamos faltante).
  Si NO existe wms.Articulos, ejecutar primero:
    sqlcmd -S localhost -E -d CuartaQuinientos -b -i SQL/DB-005_wms_schema.sql
*/
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'wms.Articulos', N'U') IS NULL
BEGIN
    RAISERROR(N'Falta wms.Articulos. Ejecute SQL/DB-005_wms_schema.sql antes de este script.', 16, 1);
    RETURN;
END
GO

IF OBJECT_ID(N'wms.Prestamos', N'U') IS NULL
BEGIN
    CREATE TABLE wms.Prestamos (
        PrestamoID            INT             NOT NULL IDENTITY(1,1),
        ArticuloID            INT             NOT NULL,
        UsuarioID             INT             NOT NULL,
        Cantidad              INT             NOT NULL,
        FechaPrestamo         DATETIME        NOT NULL CONSTRAINT DF_wms_Prestamos_FechaPrestamo DEFAULT GETDATE(),
        FechaDevolucion       DATETIME        NULL,
        Estado                NVARCHAR(20)    NOT NULL CONSTRAINT DF_wms_Prestamos_Estado DEFAULT N'PRESTADO',
        Notas                 NVARCHAR(500)   NULL,
        Creado                NVARCHAR(100)   NULL,
        Modificado            NVARCHAR(100)   NULL,
        UsuarioCreacionID     INT             NULL,
        UsuarioModificacionID INT             NULL,
        FechaCreacion         DATETIME        NULL CONSTRAINT DF_wms_Prestamos_FechaCreacion DEFAULT GETDATE(),
        FechaModificacion     DATETIME        NULL,
        bEliminado            BIT             NOT NULL CONSTRAINT DF_wms_Prestamos_bEliminado DEFAULT 0,
        CONSTRAINT PK_wms_Prestamos PRIMARY KEY (PrestamoID),
        CONSTRAINT CK_wms_Prestamos_Cantidad CHECK (Cantidad > 0),
        CONSTRAINT CK_wms_Prestamos_Estado CHECK (Estado IN (N'PRESTADO', N'DEVUELTO')),
        CONSTRAINT FK_wms_Prestamos_Articulo
            FOREIGN KEY (ArticuloID) REFERENCES wms.Articulos(ArticuloID),
        CONSTRAINT FK_wms_Prestamos_Usuario
            FOREIGN KEY (UsuarioID) REFERENCES sgr.Usuarios(UsuarioID)
    );
END
GO

IF OBJECT_ID(N'wms.Prestamos', N'U') IS NOT NULL
   AND COL_LENGTH(N'wms.Prestamos', N'Notas') IS NULL
BEGIN
    ALTER TABLE wms.Prestamos ADD Notas NVARCHAR(500) NULL;
END
GO
