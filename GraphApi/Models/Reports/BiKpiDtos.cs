using System.Text.Json.Serialization;

namespace GraphApi.Models.Reports;

public sealed class BiKpiSnapshotDto
{
    [JsonPropertyName("fecha")]
    public DateOnly Fecha { get; init; }

    [JsonPropertyName("ticketsAbiertos")]
    public int TicketsAbiertos { get; init; }

    [JsonPropertyName("ticketsCerrados")]
    public int TicketsCerrados { get; init; }

    [JsonPropertyName("tiempoMedioResolucionHoras")]
    public decimal TiempoMedioResolucionHoras { get; init; }

    [JsonPropertyName("ingresosMXN")]
    public decimal IngresosMXN { get; init; }

    [JsonPropertyName("egresosMXN")]
    public decimal EgresosMXN { get; init; }

    [JsonPropertyName("residentesMorosos")]
    public int ResidentesMorosos { get; init; }

    [JsonPropertyName("casasTotales")]
    public int CasasTotales { get; init; }

    [JsonPropertyName("casasOcupadas")]
    public int CasasOcupadas { get; init; }
}

public sealed class BiKpiCalculatedRow
{
    public int TicketsAbiertos { get; init; }
    public int TicketsCerrados { get; init; }
    public decimal TiempoMedioResolucionHoras { get; init; }
    public decimal IngresosMXN { get; init; }
    public decimal EgresosMXN { get; init; }
    public int ResidentesMorosos { get; init; }
    public int CasasTotales { get; init; }
    public int CasasOcupadas { get; init; }
}

public sealed class FinanzasCuotaExportRow
{
    public int CuotaID { get; init; }
    public string NombreUsuario { get; init; } = "";
    public decimal Monto { get; init; }
    public DateTime? FechaPago { get; init; }
    public string? MetodoPago { get; init; }
}

public sealed class FinanzasTransaccionExportRow
{
    public int TransaccionID { get; init; }
    public string Cuenta { get; init; } = "";
    public string NombreUsuario { get; init; } = "";
    public string TipoMovimiento { get; init; } = "";
    public decimal? Cargo { get; init; }
    public decimal? Abono { get; init; }
    public DateTime FechaCreacion { get; init; }
}

public sealed class TicketPeriodoExportRow
{
    public int TicketID { get; init; }
    public string TituloTicket { get; init; } = "";
    public string NombreSolicitante { get; init; } = "";
    public string PrioridadTicket { get; init; } = "";
    public string EstadoTicket { get; init; } = "";
    public DateTime FechaCreacionTicket { get; init; }
    public DateTime? FechaCierre { get; init; }
}
