/*
  OPCIONAL — columna VacunasAlDia en usr.Mascotas (badge admin "Al día" / "Pendiente").
  No bloquea alta de mascotas; la API ya funciona sin esta columna.
*/
SET NOCOUNT ON;

IF COL_LENGTH(N'usr.Mascotas', N'VacunasAlDia') IS NULL
BEGIN
    ALTER TABLE usr.Mascotas ADD VacunasAlDia BIT NULL;
    PRINT N'Columna usr.Mascotas.VacunasAlDia creada.';
END
ELSE
    PRINT N'usr.Mascotas.VacunasAlDia ya existe.';

IF COL_LENGTH(N'usr.Mascotas', N'FechaUltimaVacuna') IS NULL
BEGIN
    ALTER TABLE usr.Mascotas ADD FechaUltimaVacuna DATE NULL;
    PRINT N'Columna usr.Mascotas.FechaUltimaVacuna creada.';
END
ELSE
    PRINT N'usr.Mascotas.FechaUltimaVacuna ya existe.';
GO
