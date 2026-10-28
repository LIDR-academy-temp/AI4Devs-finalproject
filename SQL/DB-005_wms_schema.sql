/*
  DB-005 — Esquema WMS (almacén, artículos, préstamos).
  Delta completo: crea esquema wms si no existe.
  Ejecutar después de DB-004.
  sqlcmd -S <server> -d CuartaQuinientos -b -i SQL/DB-005_wms_schema.sql
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() IN (N'master', N'model', N'msdb', N'tempdb')
BEGIN
    RAISERROR(N'Ejecutar sobre CuartaQuinientos, no en BD de sistema.', 16, 1);
    SET NOEXEC ON;
END
GO

-- ══════════════════════════════════════════════════════════
--  Esquema wms
-- ══════════════════════════════════════════════════════════
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'wms')
    EXEC(N'CREATE SCHEMA wms');
GO

-- ══════════════════════════════════════════════════════════
--  wms.CategoriasArticulo
-- ══════════════════════════════════════════════════════════
IF OBJECT_ID(N'wms.CategoriasArticulo', N'U') IS NULL
BEGIN
    CREATE TABLE wms.CategoriasArticulo (
        CategoriaID         INT             NOT NULL IDENTITY(1,1),
        Nombre              NVARCHAR(100)   NOT NULL,
        Creado              NVARCHAR(100)   NULL,
        Modificado          NVARCHAR(100)   NULL,
        UsuarioCreacionID   INT             NULL,
        UsuarioModificacionID INT           NULL,
        FechaCreacion       DATETIME        NULL DEFAULT GETDATE(),
        FechaModificacion   DATETIME        NULL,
        bEliminado          BIT             NOT NULL DEFAULT 0,
        CONSTRAINT PK_wms_CategoriasArticulo PRIMARY KEY (CategoriaID)
    );
END
GO

-- ══════════════════════════════════════════════════════════
--  wms.Articulos
-- ══════════════════════════════════════════════════════════
IF OBJECT_ID(N'wms.Articulos', N'U') IS NULL
BEGIN
    CREATE TABLE wms.Articulos (
        ArticuloID          INT             NOT NULL IDENTITY(1,1),
        Nombre              NVARCHAR(200)   NOT NULL,
        CategoriaID         INT             NULL,
        Stock               INT             NOT NULL DEFAULT 0,
        StockMinimo         INT             NOT NULL DEFAULT 1,
        Ubicacion           NVARCHAR(200)   NULL,
        Creado              NVARCHAR(100)   NULL,
        Modificado          NVARCHAR(100)   NULL,
        UsuarioCreacionID   INT             NULL,
        UsuarioModificacionID INT           NULL,
        FechaCreacion       DATETIME        NULL DEFAULT GETDATE(),
        FechaModificacion   DATETIME        NULL,
        bEliminado          BIT             NOT NULL DEFAULT 0,
        CONSTRAINT PK_wms_Articulos PRIMARY KEY (ArticuloID),
        CONSTRAINT CK_wms_Articulos_Stock CHECK (Stock >= 0),
        CONSTRAINT FK_wms_Articulos_Categoria
            FOREIGN KEY (CategoriaID) REFERENCES wms.CategoriasArticulo(CategoriaID)
    );
END
GO

-- ══════════════════════════════════════════════════════════
--  wms.Prestamos
-- ══════════════════════════════════════════════════════════
IF OBJECT_ID(N'wms.Prestamos', N'U') IS NULL
BEGIN
    CREATE TABLE wms.Prestamos (
        PrestamoID          INT             NOT NULL IDENTITY(1,1),
        ArticuloID          INT             NOT NULL,
        UsuarioID           INT             NOT NULL,
        Cantidad            INT             NOT NULL,
        FechaPrestamo       DATETIME        NOT NULL DEFAULT GETDATE(),
        FechaDevolucion     DATETIME        NULL,
        Estado              NVARCHAR(20)    NOT NULL DEFAULT N'PRESTADO',
        Notas               NVARCHAR(500)   NULL,
        Creado              NVARCHAR(100)   NULL,
        Modificado          NVARCHAR(100)   NULL,
        UsuarioCreacionID   INT             NULL,
        UsuarioModificacionID INT           NULL,
        FechaCreacion       DATETIME        NULL DEFAULT GETDATE(),
        FechaModificacion   DATETIME        NULL,
        bEliminado          BIT             NOT NULL DEFAULT 0,
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

-- ══════════════════════════════════════════════════════════
--  Vista wms.vsArticulos
-- ══════════════════════════════════════════════════════════
IF OBJECT_ID(N'wms.vsArticulos', N'V') IS NOT NULL
    DROP VIEW wms.vsArticulos;
GO
CREATE VIEW wms.vsArticulos AS
SELECT
    a.ArticuloID,
    a.Nombre,
    a.CategoriaID,
    c.Nombre          AS Categoria,
    a.Stock,
    a.StockMinimo,
    CASE WHEN a.Stock < a.StockMinimo THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT) END AS BajoMinimo,
    a.Ubicacion,
    a.Creado,
    a.Modificado,
    a.FechaCreacion,
    a.FechaModificacion,
    a.bEliminado
FROM wms.Articulos a
LEFT JOIN wms.CategoriasArticulo c ON c.CategoriaID = a.CategoriaID AND c.bEliminado = 0;
GO

-- ══════════════════════════════════════════════════════════
--  Vista wms.vsPrestamos
-- ══════════════════════════════════════════════════════════
IF OBJECT_ID(N'wms.vsPrestamos', N'V') IS NOT NULL
    DROP VIEW wms.vsPrestamos;
GO
CREATE VIEW wms.vsPrestamos AS
SELECT
    p.PrestamoID,
    p.ArticuloID,
    a.Nombre          AS NombreArticulo,
    p.UsuarioID,
    u.Nombre          AS NombreUsuario,
    u.Correo          AS CorreoUsuario,
    p.Cantidad,
    p.FechaPrestamo,
    p.FechaDevolucion,
    p.Estado,
    p.Notas,
    p.Creado,
    p.Modificado,
    p.FechaCreacion,
    p.FechaModificacion,
    p.bEliminado
FROM wms.Prestamos p
INNER JOIN wms.Articulos a ON a.ArticuloID = p.ArticuloID
INNER JOIN sgr.Usuarios u ON u.UsuarioID = p.UsuarioID;
GO

-- ══════════════════════════════════════════════════════════
--  Seeds categorías base
-- ══════════════════════════════════════════════════════════
IF NOT EXISTS (SELECT 1 FROM wms.CategoriasArticulo WHERE bEliminado = 0)
BEGIN
    INSERT INTO wms.CategoriasArticulo (Nombre, FechaCreacion)
    VALUES
        (N'Herramienta', GETDATE()),
        (N'Material', GETDATE()),
        (N'Equipo', GETDATE()),
        (N'Limpieza', GETDATE()),
        (N'Otro', GETDATE());
END
GO

PRINT N'DB-005 WMS completado.';
GO
