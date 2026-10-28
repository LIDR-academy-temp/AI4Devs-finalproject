namespace GraphApi.Models.VTS.CuartaVisitas;

using System.Text.Json.Serialization;

// ── Visitas ──────────────────────────────────────────────────────────────────
public sealed class VisitaListItemDto
{
    public int VisitaId { get; set; }
    public string VisitanteNombre { get; set; } = "";
    public int? CasaId { get; set; }
    public string? NumeroCasa { get; set; }
    public string TipoIdentificacion { get; set; } = "";
    public string NumeroIdentificacion { get; set; } = "";
    public DateTime FechaEntrada { get; set; }
    public DateTime? FechaSalida { get; set; }
    public bool Autorizado { get; set; }
}

public sealed class RegistrarVisitaRequest
{
    public string VisitanteNombre { get; set; } = "";
    public int UsuarioVisitadoId { get; set; }
    public int? CasaId { get; set; }
    public string TipoIdentificacion { get; set; } = "";
    public string NumeroIdentificacion { get; set; } = "";
}

public sealed class TipoIdentificacionDto
{
    public int TipoIdentificacionId { get; set; }
    public string TipoIdentificacion { get; set; } = "";
}

public sealed class TipoIdentificacionUpsertRequest
{
    public string TipoIdentificacion { get; set; } = "";
}

// ── Áreas comunes ────────────────────────────────────────────────────────────
public sealed class AreaComunDto
{
    public int AreaComunId { get; set; }
    public string Nombre { get; set; } = "";
    public string? Descripcion { get; set; }
    public int? Capacidad { get; set; }
    public bool RequiereReservacion { get; set; }
}

// ── Reservaciones ────────────────────────────────────────────────────────────
public sealed class ReservacionAreaDto
{
    public int ReservacionAreaId { get; set; }
    public int AreaComunId { get; set; }
    public string AreaComun { get; set; } = "";
    public DateTime FechaInicio { get; set; }
    public DateTime FechaFin { get; set; }
    public string Estado { get; set; } = "";
    public DateTime FechaCreacion { get; set; }
}

public sealed class CrearReservacionRequest
{
    public int AreaComunId { get; set; }
    public DateTime FechaInicio { get; set; }
    public DateTime FechaFin { get; set; }
}

public sealed class ReservacionCalendarioDto
{
    public int ReservacionAreaId { get; set; }
    public int AreaComunId { get; set; }
    public DateTime FechaInicio { get; set; }
    public DateTime FechaFin { get; set; }
    public string Estado { get; set; } = "";
    public string Etiqueta { get; set; } = "";
}

public sealed class ReservacionAdminFiltroDto
{
    public int? AreaComunId { get; set; }
    public DateTime? Desde { get; set; }
    public DateTime? Hasta { get; set; }
    public int Pagina { get; set; } = 1;
    public int Tamano { get; set; } = 20;
}

public sealed class ReservacionAdminItemDto
{
    [JsonPropertyName("reservacionAreaId")]
    public int ReservacionAreaId { get; set; }

    [JsonPropertyName("areaComunId")]
    public int AreaComunId { get; set; }

    [JsonPropertyName("areaComun")]
    public string AreaComun { get; set; } = "";

    [JsonPropertyName("usuarioId")]
    public int UsuarioId { get; set; }

    [JsonPropertyName("usuarioNombre")]
    public string UsuarioNombre { get; set; } = "";

    [JsonPropertyName("usuarioCorreo")]
    public string UsuarioCorreo { get; set; } = "";

    [JsonPropertyName("fechaInicio")]
    public DateTime FechaInicio { get; set; }

    [JsonPropertyName("fechaFin")]
    public DateTime FechaFin { get; set; }

    [JsonPropertyName("estado")]
    public string Estado { get; set; } = "";
}
