-- DB-006: arc.vsArchivos — expose FechaCreacion for GET /ARC/Archivos (CuartaArchivosRepository)
SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER VIEW arc.vsArchivos AS
SELECT A.ArchivoID,
       A.Nombre,
       A.Ruta,
       A.TipoArchivoID,
       TA.TipoArchivo,
       A.EsPrivado,
       A.FechaCreacion,
       A.bEliminado
FROM arc.Archivos A (NOLOCK)
INNER JOIN arc.TiposArchivo TA (NOLOCK) ON TA.TipoArchivoID = A.TipoArchivoID;
GO
