using System.Data;
using GraphApi.Models.TKT;

namespace GraphApi.Repositories.TKT;

public interface ICuartaTicketDetalleRepository
{
    bool SupportsComentariosInternos { get; }

    Task<(int SolicitanteId, TicketDetalleDto Detalle)?> GetDetalleAsync(int ticketId, CancellationToken ct = default);

    Task<IReadOnlyList<ComentarioTicketDto>> ListComentariosAsync(
        int ticketId,
        bool includeInternos,
        CancellationToken ct = default);

    Task<int> InsertComentarioAsync(
        int ticketId,
        int usuarioId,
        string correo,
        string texto,
        bool esInterno,
        IDbTransaction tx);

    Task<bool> IsAsignadoActivoAsync(int ticketId, int usuarioId, IDbTransaction tx);
}
