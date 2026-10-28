using System.Data;
using GraphApi.Models.TKT;

namespace GraphApi.Repositories.TKT;

public interface ICuartaTicketAdminRepository
{
    Task<PaginaDto<AdminTicketItemDto>> ListarAsync(TicketFiltroDto filtro, int? prioridadTicketId, CancellationToken ct = default);

    Task<(int TicketId, int EstadoActualId, string EstadoActual, int SolicitanteId, string Titulo)?> GetTicketEstadoAsync(
        int ticketId,
        IDbTransaction tx);

    Task<string?> GetEstadoNombreAsync(int estadoId, IDbTransaction tx);

    Task<int> UpdateEstadoAsync(
        int ticketId,
        int estadoActualId,
        int estadoDestinoId,
        string estadoDestinoNombre,
        string modificadoCorreo,
        int modificadoPorId,
        IDbTransaction tx);

    Task InsertComentarioSistemaAsync(
        int ticketId,
        int usuarioId,
        string texto,
        string correo,
        IDbTransaction tx);

    Task<bool> IsAsignadoActivoAsync(int ticketId, int usuarioId, IDbTransaction tx);

    Task<bool> ExistsAsignacionActivaAsync(int ticketId, int usuarioId, IDbTransaction tx);

    Task<int> InsertAsignacionAsync(int ticketId, int usuarioId, string creadoCorreo, int creadoPorId, IDbTransaction tx);

    Task<bool> IsTrabajadorActivoAsync(int usuarioId, IDbTransaction tx);

    Task<bool> IsResidenteActivoAsync(int usuarioId, IDbTransaction tx);

    Task<int> UpdateMetadatosAsync(
        int ticketId,
        string titulo,
        string descripcion,
        int prioridadTicketId,
        int categoriaTicketId,
        string modificadoCorreo,
        int modificadoPorId,
        IDbTransaction tx);

    Task<int> SoftDeleteAsync(int ticketId, string modificadoCorreo, int modificadoPorId, IDbTransaction tx);

    Task<IReadOnlyList<TrabajadorItemDto>> ListarTrabajadoresAsync(CancellationToken ct = default);
}
