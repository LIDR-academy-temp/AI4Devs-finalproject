using GraphApi.Models.TKT;

namespace GraphApi.Repositories.TKT;

public interface ICuartaTicketQueryRepository
{
    Task<PaginaDto<MiTicketItemDto>> GetMisTicketsAsync(int usuarioId, TicketFiltroDto filtro, CancellationToken ct = default);
}
