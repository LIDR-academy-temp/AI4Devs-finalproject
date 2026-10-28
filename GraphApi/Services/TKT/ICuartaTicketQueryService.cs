using GraphApi.Models.TKT;

namespace GraphApi.Services.TKT;

public interface ICuartaTicketQueryService
{
    Task<PaginaDto<MiTicketItemDto>> GetMisTicketsAsync(
        int usuarioId,
        TicketFiltroDto filtro,
        CancellationToken ct = default);

    Task<IReadOnlyList<CatalogoItemDto>> ListarCategoriasAsync(CancellationToken ct = default);

    Task<IReadOnlyList<CatalogoItemDto>> ListarEstadosAsync(CancellationToken ct = default);
}
