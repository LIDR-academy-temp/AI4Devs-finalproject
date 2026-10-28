namespace GraphApi.Models.JNT.CuartaJuntas;

public sealed class JuntaListItemDto
{
    public int JuntaId { get; set; }
    public string Titulo { get; set; } = "";
    public string? Descripcion { get; set; }
    public DateTime FechaProgramada { get; set; }
    public string? Ubicacion { get; set; }
    public bool Activa { get; set; }
    public DateTime FechaCreacion { get; set; }
}

public sealed class JuntaDetalleDto
{
    public int JuntaId { get; set; }
    public string Titulo { get; set; } = "";
    public string? Descripcion { get; set; }
    public DateTime FechaProgramada { get; set; }
    public string? Ubicacion { get; set; }
    public bool Activa { get; set; }
    public DateTime FechaCreacion { get; set; }

    // Detalle (acuerdos / acta)
    public int? JuntaDetalleId { get; set; }
    public string? Contenido { get; set; }
    public DateTime? FechaRegistroDetalle { get; set; }

    // Archivos adjuntos del detalle
    public IReadOnlyList<JuntaArchivoDto> Archivos { get; set; } = [];
}

public sealed class JuntaArchivoDto
{
    public int JuntaDetalleArchivoId { get; set; }
    public string NombreArchivo { get; set; } = "";
    public string Ruta { get; set; } = "";
    public string? TipoArchivo { get; set; }
}

public sealed class JuntaCrearRequest
{
    public string Titulo { get; set; } = "";
    public string? Descripcion { get; set; }
    public DateTime FechaProgramada { get; set; }
    public string? Ubicacion { get; set; }
    // Detalle inicial (acta borrador / convocatoria)
    public string? Contenido { get; set; }
}

public sealed class JuntaActualizarRequest
{
    public string? Titulo { get; set; }
    public string? Descripcion { get; set; }
    public DateTime? FechaProgramada { get; set; }
    public string? Ubicacion { get; set; }
    public bool? Activa { get; set; }
    // Actualiza o crea el detalle
    public string? Contenido { get; set; }
}
