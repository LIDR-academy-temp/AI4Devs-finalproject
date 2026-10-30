using GraphApi.Infrastructure;
using GraphApi.Models.NTF;
using GraphApi.Models.TKT;
using GraphApi.Models.TKT.Tickets;
using GraphApi.Repositories.TKT;
using GraphApi.Services.NTF;

namespace GraphApi.Services.TKT;

public sealed class CuartaTicketAdminService : ICuartaTicketAdminService
{
    private readonly ICuartaTicketAdminRepository _repo;
    private readonly ITicketCatalogoRepository _catalogos;
    private readonly ICuartaTicketRepository _tickets;
    private readonly INotificacionService _notificaciones;
    private readonly IUnitOfWork _uow;

    public CuartaTicketAdminService(
        ICuartaTicketAdminRepository repo,
        ITicketCatalogoRepository catalogos,
        ICuartaTicketRepository tickets,
        INotificacionService notificaciones,
        IUnitOfWork uow)
    {
        _repo = repo;
        _catalogos = catalogos;
        _tickets = tickets;
        _notificaciones = notificaciones;
        _uow = uow;
    }

    public Task<PaginaDto<AdminTicketItemDto>> ListarAsync(
        TicketFiltroDto filtro,
        int? prioridadTicketId,
        CancellationToken ct = default) =>
        _repo.ListarAsync(filtro, prioridadTicketId, ct);

    public async Task<(clReadTickets? Ticket, string? Code, int Status, string? Detail)> CrearTicketAdminAsync(
        CrearTicketAdminInput input,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default)
    {
        var prioridad = string.IsNullOrWhiteSpace(input.Prioridad) ? "Media" : input.Prioridad;
        var canal = string.IsNullOrWhiteSpace(input.Canal) ? "WEB" : input.Canal;

        var tx = _uow.BeginTransaction();
        try
        {
            if (!await _repo.IsResidenteActivoAsync(input.UsuarioSolicitanteId, tx))
            {
                _uow.Rollback();
                return (null, "VALIDATION_ERROR", StatusCodes.Status400BadRequest,
                    "El solicitante no es un residente activo");
            }

            var estadoId = await _catalogos.ResolveEstadoIdAsync("Nuevo", tx);
            var prioridadId = await _catalogos.ResolvePrioridadIdAsync(prioridad, tx);
            if (prioridadId is null)
            {
                _uow.Rollback();
                return (null, "VALIDATION_ERROR", StatusCodes.Status400BadRequest, "Prioridad inválida");
            }
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
            catch (NotSupportedException)
            {
                // Canales no disponibles en este ambiente — continuar sin canal
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
                UsuarioSolicitanteId = input.UsuarioSolicitanteId,
                PrioridadTicketId = prioridadId.Value,
                EstadoTicketId = estadoId,
                CategoriaTicketId = categoriaId,
                CanalId = canalId,
                CreadoCorreo = adminCorreo,
            }, tx);

            var autor = new NotificacionAutor(adminId, adminCorreo);
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

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> ActualizarMetadatosAsync(
        int ticketId,
        ActualizarTicketAdminInput input,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default)
    {
        var prioridad = string.IsNullOrWhiteSpace(input.Prioridad) ? "Media" : input.Prioridad;

        var tx = _uow.BeginTransaction();
        try
        {
            var ticket = await _repo.GetTicketEstadoAsync(ticketId, tx);
            if (ticket is null)
            {
                _uow.Rollback();
                return (false, "NOT_FOUND", StatusCodes.Status404NotFound, "Ticket no encontrado");
            }

            if (ticket.Value.EstadoActual.Equals("Cerrado", StringComparison.OrdinalIgnoreCase))
            {
                _uow.Rollback();
                return (false, "TICKET_CLOSED", StatusCodes.Status422UnprocessableEntity,
                    "No se pueden editar tickets cerrados");
            }

            var prioridadId = await _catalogos.ResolvePrioridadIdAsync(prioridad, tx);
            if (prioridadId is null)
            {
                _uow.Rollback();
                return (false, "VALIDATION_ERROR", StatusCodes.Status400BadRequest, "Prioridad inválida");
            }
            var categoriaId = await _catalogos.ResolveCategoriaIdAsync(input.Categoria, tx);
            if (categoriaId is null)
            {
                _uow.Rollback();
                return (false, "VALIDATION_ERROR", StatusCodes.Status400BadRequest, "Categoría inválida");
            }

            var rows = await _repo.UpdateMetadatosAsync(
                ticketId,
                input.Titulo.Trim(),
                input.Descripcion.Trim(),
                prioridadId.Value,
                categoriaId.Value,
                adminCorreo,
                adminId,
                tx);

            if (rows != 1)
            {
                _uow.Rollback();
                return (false, "NOT_FOUND", StatusCodes.Status404NotFound, "Ticket no encontrado");
            }

            await _repo.InsertComentarioSistemaAsync(
                ticketId,
                adminId,
                "Metadatos actualizados por administrador",
                adminCorreo,
                tx);

            _uow.Commit();
            return (true, null, StatusCodes.Status204NoContent, null);
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> SoftDeleteAsync(
        int ticketId,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default)
    {
        var tx = _uow.BeginTransaction();
        try
        {
            var ticket = await _repo.GetTicketEstadoAsync(ticketId, tx);
            if (ticket is null)
            {
                _uow.Rollback();
                return (false, "NOT_FOUND", StatusCodes.Status404NotFound, "Ticket no encontrado");
            }

            var rows = await _repo.SoftDeleteAsync(ticketId, adminCorreo, adminId, tx);
            if (rows != 1)
            {
                _uow.Rollback();
                return (false, "NOT_FOUND", StatusCodes.Status404NotFound, "Ticket no encontrado");
            }

            _uow.Commit();
            return (true, null, StatusCodes.Status204NoContent, null);
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> CambiarEstadoAsync(
        int ticketId,
        int estadoDestinoId,
        int usuarioId,
        string correo,
        string perfil,
        CancellationToken ct = default)
    {
        var tx = _uow.BeginTransaction();
        try
        {
            var ticket = await _repo.GetTicketEstadoAsync(ticketId, tx);
            if (ticket is null)
            {
                _uow.Rollback();
                return (false, "NOT_FOUND", StatusCodes.Status404NotFound, "Ticket no encontrado");
            }

            var estadoDestino = await _repo.GetEstadoNombreAsync(estadoDestinoId, tx);
            if (estadoDestino is null)
            {
                _uow.Rollback();
                return (false, "VALIDATION_ERROR", StatusCodes.Status400BadRequest, "Estado destino inválido");
            }

            var (_, estadoActualId, estadoActual, solicitanteId, titulo) = ticket.Value;

            if (!TicketStatusTransitions.IsValid(estadoActual, estadoDestino))
            {
                _uow.Rollback();
                return (false, "INVALID_TRANSITION", StatusCodes.Status422UnprocessableEntity,
                    $"Transición no permitida: {estadoActual} → {estadoDestino}");
            }

            var esAdmin = string.Equals(perfil, "Administrador", StringComparison.OrdinalIgnoreCase);
            if (!esAdmin)
            {
                var esTrabajador = string.Equals(perfil, "Trabajador", StringComparison.OrdinalIgnoreCase);
                if (!esTrabajador || !TrabajadorPuedeTransicion(estadoActual, estadoDestino))
                {
                    _uow.Rollback();
                    return (false, "FORBIDDEN", StatusCodes.Status403Forbidden, "No autorizado para esta transición");
                }

                if (!await _repo.IsAsignadoActivoAsync(ticketId, usuarioId, tx))
                {
                    _uow.Rollback();
                    return (false, "FORBIDDEN", StatusCodes.Status403Forbidden, "No estás asignado a este ticket");
                }
            }

            var rows = await _repo.UpdateEstadoAsync(
                ticketId, estadoActualId, estadoDestinoId, estadoDestino, correo, usuarioId, tx);
            if (rows != 1)
            {
                _uow.Rollback();
                return (false, "CONFLICT", StatusCodes.Status409Conflict, "El ticket cambió; intenta de nuevo");
            }

            await _repo.InsertComentarioSistemaAsync(
                ticketId,
                usuarioId,
                $"Estado: {estadoActual} → {estadoDestino}",
                correo,
                tx);

            var autor = new NotificacionAutor(usuarioId, correo);
            await _notificaciones.NotificarUsuarioAsync(
                tx,
                solicitanteId,
                "TICKET_ESTADO",
                $"Ticket #{ticketId} actualizado",
                $"Tu ticket '{titulo}' pasó a {estadoDestino}.",
                autor);

            _uow.Commit();
            return (true, null, StatusCodes.Status204NoContent, null);
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }

    public async Task<(bool Ok, int? AsignacionId, string? Code, int Status, string? Detail)> AsignarAsync(
        AsignarTicketRequest request,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default)
    {
        var tx = _uow.BeginTransaction();
        try
        {
            var ticket = await _repo.GetTicketEstadoAsync(request.TicketId, tx);
            if (ticket is null)
            {
                _uow.Rollback();
                return (false, null, "NOT_FOUND", StatusCodes.Status404NotFound, "Ticket no encontrado");
            }

            if (!await _repo.IsTrabajadorActivoAsync(request.UsuarioId, tx))
            {
                _uow.Rollback();
                return (false, null, "VALIDATION_ERROR", StatusCodes.Status422UnprocessableEntity,
                    "El usuario no es un trabajador activo");
            }

            if (await _repo.ExistsAsignacionActivaAsync(request.TicketId, request.UsuarioId, tx))
            {
                _uow.Rollback();
                return (false, null, "CONFLICT", StatusCodes.Status409Conflict, "Ya existe una asignación activa");
            }

            var asignacionId = await _repo.InsertAsignacionAsync(
                request.TicketId, request.UsuarioId, adminCorreo, adminId, tx);

            var autor = new NotificacionAutor(adminId, adminCorreo);
            await _notificaciones.NotificarUsuarioAsync(
                tx,
                request.UsuarioId,
                "TICKET_ASIGNADO",
                $"Asignación ticket #{request.TicketId}",
                $"Se te asignó el ticket '{ticket.Value.Item5}'.",
                autor);

            _uow.Commit();
            return (true, asignacionId, null, StatusCodes.Status201Created, null);
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }

    public Task<IReadOnlyList<TrabajadorItemDto>> ListarTrabajadoresAsync(CancellationToken ct = default) =>
        _repo.ListarTrabajadoresAsync(ct);

    private static bool TrabajadorPuedeTransicion(string from, string to) =>
        (from.Equals("Nuevo", StringComparison.OrdinalIgnoreCase)
         && to.Equals("En seguimiento", StringComparison.OrdinalIgnoreCase))
        || (from.Equals("En seguimiento", StringComparison.OrdinalIgnoreCase)
            && to.Equals("Resuelto", StringComparison.OrdinalIgnoreCase));
}
