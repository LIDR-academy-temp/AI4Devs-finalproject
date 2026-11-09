/*
  DB-008 — Semilla de tipos de identificación para visitas (si la tabla está vacía).
  sqlcmd -S localhost -E -d CuartaQuinientos -b -i SQL/DB-008_vts_tipos_identificacion_seed.sql
*/
SET NOCOUNT ON;

IF NOT EXISTS (SELECT 1 FROM vts.TipoIdentificacion WHERE bEliminado = 0)
BEGIN
    INSERT INTO vts.TipoIdentificacion (TipoIdentificacion, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
    VALUES
        (N'INE', N'DB-008', 1, GETDATE(), 0),
        (N'Pasaporte', N'DB-008', 1, GETDATE(), 0),
        (N'Licencia de conducir', N'DB-008', 1, GETDATE(), 0),
        (N'CURP', N'DB-008', 1, GETDATE(), 0),
        (N'Otro', N'DB-008', 1, GETDATE(), 0);
    PRINT N'DB-008: tipos de identificación insertados.';
END
ELSE
    PRINT N'DB-008: ya existen tipos; sin cambios.';
GO
