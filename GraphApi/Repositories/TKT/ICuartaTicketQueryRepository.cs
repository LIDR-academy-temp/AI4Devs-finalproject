using GraphApi.Models.TKT;

namespace GraphApi.Repositories.TKT;

public interface ICuartaTicketQueryRepository
{
    Task<PaginaDto<MiTicketItemDto>> GetMisTicketsAsync(int usuarioId, TicketFiltroDto filtro, CancellationToken ct = default);

    Task<PaginaDto<MiTicketItemDto>> GetTicketsAsignadosAsync(
        int usuarioId,
        TicketAsignadosFiltroDto filtro,
        CancellationToken ct = default);
}
