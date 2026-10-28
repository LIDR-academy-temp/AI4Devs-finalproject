using GraphApi.Infrastructure;
using GraphApi.Models.NTF;
using GraphApi.Models.TKT;
using GraphApi.Models.TKT.Tickets;
using GraphApi.Repositories.TKT;
using GraphApi.Services.NTF;

namespace GraphApi.Services.TKT;

public sealed class CuartaTicketService : ICuartaTicketService
{
    private readonly ITicketCatalogoRepository _catalogos;
    private readonly ICuartaTicketRepository _tickets;
    private readonly INotificacionService _notificaciones;
    private readonly IUnitOfWork _uow;

    public CuartaTicketService(
        ITicketCatalogoRepository catalogos,
        ICuartaTicketRepository tickets,
        INotificacionService notificaciones,
        IUnitOfWork uow)
    {
        _catalogos = catalogos;
        _tickets = tickets;
        _notificaciones = notificaciones;
        _uow = uow;
    }

    public async Task<(clReadTickets? Ticket, string? Code, int Status, string? Detail)> CrearTicketAsync(
        CrearTicketInput input,
        int usuarioId,
        string correo,
        string perfil,
        CancellationToken ct = default)
    {
        if (!string.Equals(perfil, "Residente", StringComparison.OrdinalIgnoreCase))
        {
            return (null, "FORBIDDEN", StatusCodes.Status403Forbidden, "Solo residentes pueden crear tickets");
        }

        var prioridad = string.IsNullOrWhiteSpace(input.Prioridad) ? "Media" : input.Prioridad;
        var canal = string.IsNullOrWhiteSpace(input.Canal) ? "WEB" : input.Canal;

        var tx = _uow.BeginTransaction();
        try
        {
            var estadoId = await _catalogos.ResolveEstadoIdAsync("Nuevo", tx);
            var prioridadId = await _catalogos.ResolvePrioridadIdAsync(prioridad, tx);
            var categoriaId = await _catalogos.ResolveCategoriaIdAsync(input.Categoria, tx);
            if (categoriaId is null)
            {
                _uow.Rollback();
                return (null, "VALIDATION_ERROR", StatusCodes.Status400BadRequest, "Categoría inválida");
            }

            int? canalId = null;
            try
            {
                canalId = await _catalogos.ResolveCanalIdAsync(canal, tx);
            }
            catch (InvalidOperationException)
            {
                _uow.Rollback();
                return (null, "VALIDATION_ERROR", StatusCodes.Status400BadRequest, "Canal inválido");
            }

            var ticketId = await _tickets.InsertarAsync(new CrearTicketInsertArgs
            {
                Titulo = input.Titulo.Trim(),
                Descripcion = input.Descripcion.Trim(),
                UsuarioSolicitanteId = usuarioId,
                PrioridadTicketId = prioridadId,
                EstadoTicketId = estadoId,
                CategoriaTicketId = categoriaId,
                CanalId = canalId,
                CreadoCorreo = correo,
            }, tx);

            var autor = new NotificacionAutor(usuarioId, correo);
            await _notificaciones.NotificarAdministradoresAsync(
                tx,
                "TICKET_NUEVO",
                $"Nuevo ticket #{ticketId}",
                $"{input.Titulo}: {input.Descripcion}",
                autor);

            _uow.Commit();

            var ticket = await _tickets.ObtenerVistaAsync(ticketId);
            return (ticket, null, StatusCodes.Status201Created, null);
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }
}
