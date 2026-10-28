using GraphApi.Models.TKT;

namespace GraphApi.Services.TKT;

public interface ICuartaTicketDetalleService
{
    Task<(TicketDetalleDto? Detalle, string? Code, int Status, string? Detail)> GetDetalleAsync(
        int ticketId,
        int usuarioId,
        string perfil,
        CancellationToken ct = default);

    Task<(IReadOnlyList<ComentarioTicketDto>? Items, string? Code, int Status, string? Detail)> ListComentariosAsync(
        int ticketId,
        int usuarioId,
        string perfil,
        CancellationToken ct = default);

    Task<(ComentarioTicketDto? Item, string? Code, int Status, string? Detail)> AgregarComentarioAsync(
        int ticketId,
        CrearComentarioTicketInput input,
        int usuarioId,
        string correo,
        string perfil,
        CancellationToken ct = default);
}
