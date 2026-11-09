using GraphApi.Models.NTF;
using GraphApi.Models.TKT;
using GraphApi.Models.TKT.Tickets;

namespace GraphApi.Services.TKT;

public interface ICuartaTicketService
{
    Task<(clReadTickets? Ticket, string? Code, int Status, string? Detail)> CrearTicketAsync(
        CrearTicketInput input,
        int usuarioId,
        string correo,
        string perfil,
        CancellationToken ct = default);
}
