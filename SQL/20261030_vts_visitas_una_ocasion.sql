-- vts.VisitasGeneradas: bUnaOcasion = 1 una entrada; 0 válido en rango de fechas (múltiples accesos)
IF COL_LENGTH(N'vts.VisitasGeneradas', N'bUnaOcasion') IS NULL
BEGIN
    ALTER TABLE vts.VisitasGeneradas
        ADD bUnaOcasion bit NOT NULL
            CONSTRAINT DF_vts_VisitasGeneradas_bUnaOcasion DEFAULT ((1));
END
GO

CREATE OR ALTER VIEW vts.vsVisitasGeneradas AS
SELECT V.VisitaGeneradaID,
       V.NombreVisitante,
       V.UsuarioVisitadoID,
       U.Nombre AS NombreVisitado,
       U.Correo AS CorreoVisitado,
       V.CasaID,
       C.Direccion AS DireccionCasa,
       C.Numero AS NumeroExtCasa,
       V.TipoIdentificacionID,
       TI.TipoIdentificacion,
       V.NumeroIdentificacion,
       V.RutaDocumento,
       V.CodigoQR,
       V.FechaEmision,
       V.FechaExpira,
       V.bUsado,
       V.bUnaOcasion,
       V.bEliminado
FROM vts.VisitasGeneradas V WITH (NOLOCK)
INNER JOIN sgr.Usuarios U WITH (NOLOCK) ON U.UsuarioID = V.UsuarioVisitadoID
INNER JOIN sgr.Casas C WITH (NOLOCK) ON C.CasaID = V.CasaID
INNER JOIN vts.TipoIdentificacion TI WITH (NOLOCK) ON TI.TipoIdentificacionID = V.TipoIdentificacionID;
GO
