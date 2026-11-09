using System.Text.Json.Serialization;

namespace GraphApi.Models.VTS.CuartaVisitasGeneradas;

public sealed class PaseVisitaDto
{
    [JsonPropertyName("visitaGeneradaId")]
    public int VisitaGeneradaId { get; set; }

    [JsonPropertyName("nombreVisitante")]
    public string NombreVisitante { get; set; } = "";

    [JsonPropertyName("codigoQr")]
    public string CodigoQr { get; set; } = "";

    [JsonPropertyName("fechaEmision")]
    public DateTime FechaEmision { get; set; }

    [JsonPropertyName("fechaExpira")]
    public DateTime? FechaExpira { get; set; }

    [JsonPropertyName("bUsado")]
    public bool BUsado { get; set; }

    /// <summary>true = una sola entrada; false = válido en el rango FechaEmision–FechaExpira</summary>
    [JsonPropertyName("unaOcasion")]
    public bool UnaOcasion { get; set; } = true;

    /// <summary>vigente | expirado | usado</summary>
    [JsonPropertyName("estadoLista")]
    public string EstadoLista { get; set; } = "";

    [JsonPropertyName("casaId")]
    public int? CasaId { get; set; }

    [JsonPropertyName("direccionCasa")]
    public string? DireccionCasa { get; set; }

    [JsonPropertyName("tipoIdentificacion")]
    public string? TipoIdentificacion { get; set; }

    [JsonPropertyName("numeroIdentificacion")]
    public string? NumeroIdentificacion { get; set; }

    [JsonPropertyName("usuarioVisitadoId")]
    public int UsuarioVisitadoId { get; set; }

    [JsonPropertyName("nombreVisitado")]
    public string? NombreVisitado { get; set; }
}

public class CrearPaseRequest
{
    public string NombreVisitante { get; set; } = "";
    public int? TipoIdentificacionId { get; set; }
    public string? NumeroIdentificacion { get; set; }
    public DateTime FechaInicio { get; set; }
    public DateTime FechaFin { get; set; }
    public bool TodoElDia { get; set; }

    /// <summary>true (default): un solo uso. false: vigente todo el rango de fechas.</summary>
    public bool UnaOcasion { get; set; } = true;
}

public sealed class CrearPaseAdminRequest : CrearPaseRequest
{
    [JsonPropertyName("usuarioVisitadoId")]
    public int UsuarioVisitadoId { get; set; }

    /// <summary>Casa del pase cuando el residente no tiene ocupante/propietario vigente (solo admin).</summary>
    [JsonPropertyName("casaId")]
    public int? CasaId { get; set; }
}

public sealed class ValidarPaseRequest
{
    public string CodigoQr { get; set; } = "";
}

public sealed class ValidarPaseResponse
{
    [JsonPropertyName("estado")]
    public string Estado { get; set; } = "";

    [JsonPropertyName("detalle")]
    public string? Detalle { get; set; }

    [JsonPropertyName("pase")]
    public PaseVisitaDto? Pase { get; set; }
}

public sealed class UsarPaseResponse
{
    [JsonPropertyName("ok")]
    public bool Ok { get; set; }

    [JsonPropertyName("yaUsado")]
    public bool YaUsado { get; set; }

    [JsonPropertyName("pase")]
    public PaseVisitaDto? Pase { get; set; }

    [JsonPropertyName("visitaId")]
    public int? VisitaId { get; set; }
}
