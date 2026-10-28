namespace GraphApi.Models.VTS.CuartaVisitas;

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
