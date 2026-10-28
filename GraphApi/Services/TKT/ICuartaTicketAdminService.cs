using GraphApi.Models.TKT;

namespace GraphApi.Services.TKT;

public interface ICuartaTicketAdminService
{
    Task<PaginaDto<AdminTicketItemDto>> ListarAsync(
        TicketFiltroDto filtro,
        int? prioridadTicketId,
        CancellationToken ct = default);

    Task<(bool Ok, string? Code, int Status, string? Detail)> CambiarEstadoAsync(
        int ticketId,
        int estadoDestinoId,
        int usuarioId,
        string correo,
        string perfil,
        CancellationToken ct = default);

    Task<(bool Ok, int? AsignacionId, string? Code, int Status, string? Detail)> AsignarAsync(
        AsignarTicketRequest request,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default);

    Task<IReadOnlyList<TrabajadorItemDto>> ListarTrabajadoresAsync(CancellationToken ct = default);
}
