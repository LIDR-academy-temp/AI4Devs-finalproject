namespace GraphApi.Models.TKT.Graphql;

public sealed class UserErrorGraph
{
    public string Message { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Field { get; set; }
}

public sealed class TicketCreatedGraph
{
    public int Id { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string Estado { get; set; } = string.Empty;
    public string Prioridad { get; set; } = string.Empty;
    public string? Categoria { get; set; }
    public string? Canal { get; set; }
    public DateTime FechaCreacion { get; set; }
}

public sealed class CrearTicketPayload
{
    public TicketCreatedGraph? Ticket { get; set; }
    public IReadOnlyList<UserErrorGraph>? Errors { get; set; }

    public static CrearTicketPayload FromServiceResult(
        GraphApi.Models.TKT.Tickets.clReadTickets? ticket,
        string? code,
        string? detail)
    {
        if (ticket is not null)
        {
            return new CrearTicketPayload
            {
                Ticket = new TicketCreatedGraph
                {
                    Id = ticket.TicketID ?? 0,
                    Titulo = ticket.TituloTicket ?? string.Empty,
                    Estado = ticket.EstadoTicket ?? string.Empty,
                    Prioridad = ticket.PrioridadTicket ?? string.Empty,
                    FechaCreacion = ticket.FechaCreacionTicket ?? DateTime.UtcNow,
                },
            };
        }

        var field = code == "VALIDATION_ERROR" && detail?.Contains("Categoría", StringComparison.OrdinalIgnoreCase) == true
            ? "categoria"
            : null;

        return new CrearTicketPayload
        {
            Errors =
            [
                new UserErrorGraph
                {
                    Code = code ?? "ERROR",
                    Message = detail ?? "No se pudo crear el ticket",
                    Field = field,
                },
            ],
        };
    }
}
