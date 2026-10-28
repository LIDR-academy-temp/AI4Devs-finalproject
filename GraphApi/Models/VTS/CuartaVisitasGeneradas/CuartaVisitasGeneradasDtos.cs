namespace GraphApi.Models.VTS.CuartaVisitasGeneradas;

public sealed class PaseVisitaDto
{
    public int VisitaGeneradaId { get; set; }
    public string NombreVisitante { get; set; } = "";
    public string CodigoQr { get; set; } = "";
    public DateTime FechaEmision { get; set; }
    public DateTime? FechaExpira { get; set; }
    public bool BUsado { get; set; }
    /// <summary>vigente | expirado | usado</summary>
    public string EstadoLista { get; set; } = "";
    public int? CasaId { get; set; }
    public string? DireccionCasa { get; set; }
    public string? TipoIdentificacion { get; set; }
    public string? NumeroIdentificacion { get; set; }
}

public sealed class CrearPaseRequest
{
    public string NombreVisitante { get; set; } = "";
    public int? TipoIdentificacionId { get; set; }
    public string? NumeroIdentificacion { get; set; }
    public DateTime FechaInicio { get; set; }
    public DateTime FechaFin { get; set; }
    public bool TodoElDia { get; set; }
}

public sealed class ValidarPaseRequest
{
    public string CodigoQr { get; set; } = "";
}

public sealed class ValidarPaseResponse
{
    public string Estado { get; set; } = "";
    public string? Detalle { get; set; }
    public PaseVisitaDto? Pase { get; set; }
}

public sealed class UsarPaseResponse
{
    public bool Ok { get; set; }
    public bool YaUsado { get; set; }
    public PaseVisitaDto? Pase { get; set; }
}
