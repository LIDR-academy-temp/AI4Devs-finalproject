using GraphApi.Infrastructure;
using GraphApi.Models.TKT;
using GraphApi.Repositories.TKT;

namespace GraphApi.Services.TKT;

public sealed class CuartaTicketDetalleService : ICuartaTicketDetalleService
{
    private readonly ICuartaTicketDetalleRepository _repo;
    private readonly IUnitOfWork _uow;

    public CuartaTicketDetalleService(ICuartaTicketDetalleRepository repo, IUnitOfWork uow)
    {
        _repo = repo;
        _uow = uow;
    }

    public async Task<(TicketDetalleDto? Detalle, string? Code, int Status, string? Detail)> GetDetalleAsync(
        int ticketId,
        int usuarioId,
        string perfil,
        CancellationToken ct = default)
    {
        var row = await _repo.GetDetalleAsync(ticketId, ct);
        if (row is null)
        {
            return (null, "NOT_FOUND", StatusCodes.Status404NotFound, "Ticket no encontrado");
        }

        var (solicitanteId, detalle) = row.Value;
        if (!await TieneAccesoAsync(ticketId, usuarioId, perfil, solicitanteId))
        {
            return (null, "NOT_FOUND", StatusCodes.Status404NotFound, "Ticket no encontrado");
        }

        return (detalle, null, StatusCodes.Status200OK, null);
    }

    public async Task<(IReadOnlyList<ComentarioTicketDto>? Items, string? Code, int Status, string? Detail)> ListComentariosAsync(
        int ticketId,
        int usuarioId,
        string perfil,
        CancellationToken ct = default)
    {
        var row = await _repo.GetDetalleAsync(ticketId, ct);
        if (row is null)
        {
            return (null, "NOT_FOUND", StatusCodes.Status404NotFound, "Ticket no encontrado");
        }

        var (solicitanteId, _) = row.Value;
        if (!await TieneAccesoAsync(ticketId, usuarioId, perfil, solicitanteId))
        {
            return (null, "NOT_FOUND", StatusCodes.Status404NotFound, "Ticket no encontrado");
        }

        var esAdmin = EsAdmin(perfil);
        var items = await _repo.ListComentariosAsync(ticketId, esAdmin, ct);
        return (items, null, StatusCodes.Status200OK, null);
    }

    public async Task<(ComentarioTicketDto? Item, string? Code, int Status, string? Detail)> AgregarComentarioAsync(
        int ticketId,
        CrearComentarioTicketInput input,
        int usuarioId,
        string correo,
        string perfil,
        CancellationToken ct = default)
    {
        var row = await _repo.GetDetalleAsync(ticketId, ct);
        if (row is null)
        {
            return (null, "NOT_FOUND", StatusCodes.Status404NotFound, "Ticket no encontrado");
        }

        var (solicitanteId, _) = row.Value;
        if (!await TieneAccesoAsync(ticketId, usuarioId, perfil, solicitanteId))
        {
            return (null, "NOT_FOUND", StatusCodes.Status404NotFound, "Ticket no encontrado");
        }

        var esAdmin = EsAdmin(perfil);
        var esInterno = esAdmin && _repo.SupportsComentariosInternos && input.EsInterno;

        var tx = _uow.BeginTransaction();
        try
        {
            var id = await _repo.InsertComentarioAsync(
                ticketId, usuarioId, correo, input.Comentario.Trim(), esInterno, tx);
            _uow.Commit();

            var dto = new ComentarioTicketDto
            {
                ComentarioTicketId = id,
                Comentario = input.Comentario.Trim(),
                FechaComentario = DateTime.UtcNow,
                AutorNombre = correo,
                EsInterno = esInterno,
            };
            return (dto, null, StatusCodes.Status201Created, null);
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }

    private async Task<bool> TieneAccesoAsync(
        int ticketId,
        int usuarioId,
        string perfil,
        int solicitanteId)
    {
        if (EsAdmin(perfil))
        {
            return true;
        }

        if (usuarioId == solicitanteId)
        {
            return true;
        }

        if (!string.Equals(perfil, "Trabajador", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var tx = _uow.BeginTransaction();
        try
        {
            var ok = await _repo.IsAsignadoActivoAsync(ticketId, usuarioId, tx);
            _uow.Rollback();
            return ok;
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }

    private static bool EsAdmin(string perfil) =>
        string.Equals(perfil, "Administrador", StringComparison.OrdinalIgnoreCase);
}
