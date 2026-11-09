using System.Text.Json.Serialization;

namespace GraphApi.Models.Dashboard;

public sealed class ResumenAdminDto
{
    [JsonPropertyName("tipo")]
    public string Tipo => "ADMIN";

    [JsonPropertyName("ticketsNuevos")]
    public int TicketsNuevos { get; init; }

    [JsonPropertyName("ticketsEnSeguimiento")]
    public int TicketsEnSeguimiento { get; init; }

    [JsonPropertyName("morososMes")]
    public int MorososMes { get; init; }

    [JsonPropertyName("montoCobrado")]
    public decimal MontoCobrado { get; init; }

    [JsonPropertyName("montoPendiente")]
    public decimal MontoPendiente { get; init; }

    [JsonPropertyName("ocupacion")]
    public decimal Ocupacion { get; init; }

    [JsonPropertyName("ticketsPorCanal")]
    public TicketsPorCanalDto TicketsPorCanal { get; init; } = new();
}

public sealed class TicketsPorCanalDto
{
    [JsonPropertyName("web")]
    public int Web { get; init; }

    [JsonPropertyName("telegram")]
    public int Telegram { get; init; }
}

public sealed class ResumenResidenteDto
{
    [JsonPropertyName("tipo")]
    public string Tipo => "RESIDENTE";

    [JsonPropertyName("ticketsActivos")]
    public int TicketsActivos { get; init; }

    [JsonPropertyName("estadoCuotaMes")]
    public EstadoCuotaMesDto? EstadoCuotaMes { get; init; }

    [JsonPropertyName("notificacionesNoLeidas")]
    public int NotificacionesNoLeidas { get; init; }

    [JsonPropertyName("avisoVencida")]
    public bool AvisoVencida { get; init; }
}

public sealed class EstadoCuotaMesDto
{
    [JsonPropertyName("monto")]
    public decimal Monto { get; init; }

    [JsonPropertyName("fechaVencimiento")]
    public DateOnly FechaVencimiento { get; init; }

    [JsonPropertyName("estado")]
    public string Estado { get; init; } = "";
}

public sealed class ResumenPeriodoQuery
{
    public int? Mes { get; set; }
    public int? Anio { get; set; }
}
