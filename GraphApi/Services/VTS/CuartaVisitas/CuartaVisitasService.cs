using System.Data;
using GraphApi.Models.TKT;
using GraphApi.Models.VTS.CuartaVisitas;
using GraphApi.Repositories.VTS;
using Microsoft.AspNetCore.Http;

namespace GraphApi.Services.VTS.CuartaVisitas;

public sealed class CuartaVisitasService(
    ICuartaVisitasRepository repo,
    IDbConnection db) : ICuartaVisitasService
{
    public Task<IReadOnlyList<VisitaListItemDto>> ListarVisitasAsync(
        int? casaId, DateTime? desde, DateTime? hasta, CancellationToken ct = default)
        => repo.ListarVisitasAsync(casaId, desde, hasta, ct);

    public Task<IReadOnlyList<AreaComunDto>> ListarAreasAsync(CancellationToken ct = default)
        => repo.ListarAreasAsync(ct);

    public Task<IReadOnlyList<ReservacionAreaDto>> ListarReservacionesMiasAsync(
        int userId, CancellationToken ct = default)
        => repo.ListarReservacionesMiasAsync(userId, ct);

    public async Task<(IReadOnlyList<ReservacionCalendarioDto>? Eventos, string? Code, int Status, string? Detail)>
        ListarReservacionesCalendarioAsync(
            int? areaComunId, DateTime desde, DateTime hasta, CancellationToken ct = default)
    {
        if (areaComunId is <= 0)
            return (null, "VTS_AREA_INVALIDA", StatusCodes.Status422UnprocessableEntity, "Identificador de área inválido.");
        if (hasta <= desde)
            return (null, "VTS_RANGO_INVALIDO", StatusCodes.Status422UnprocessableEntity, "El rango de fechas es inválido.");
        if ((hasta - desde).TotalDays > 62)
            return (null, "VTS_RANGO_EXCESIVO", StatusCodes.Status422UnprocessableEntity, "El rango máximo del calendario es 62 días.");

        var eventos = await repo.ListarReservacionesCalendarioAsync(areaComunId, desde, hasta, ct);
        return (eventos, null, StatusCodes.Status200OK, null);
    }

    public Task<PaginaDto<ReservacionAdminItemDto>> ListarReservacionesAdminAsync(
        ReservacionAdminFiltroDto filtro, CancellationToken ct = default)
        => repo.ListarReservacionesAdminAsync(filtro, ct);

    // ── Registrar entrada ────────────────────────────────────────────────────
    public async Task<(VisitaListItemDto? Visita, string? Code, int Status, string? Detail)> RegistrarEntradaAsync(
        RegistrarVisitaRequest request, string correo, int userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.VisitanteNombre))
            return (null, "VTS_NOMBRE_REQUERIDO", 422, "El nombre del visitante es obligatorio.");
        if (string.IsNullOrWhiteSpace(request.NumeroIdentificacion))
            return (null, "VTS_IDENTIFICACION_REQUERIDA", 422, "El número de identificación es obligatorio.");

        if (db.State != ConnectionState.Open) db.Open();
        using var tx = db.BeginTransaction();
        try
        {
            var tipoId = await repo.ResolverTipoIdentificacionIdAsync(request.TipoIdentificacion, tx);
            if (tipoId is null)
                return (null, "VTS_TIPO_IDENT_INVALIDO", 422, $"Tipo de identificación '{request.TipoIdentificacion}' no encontrado.");

            var visitaId = await repo.InsertVisitaAsync(request, tipoId.Value, correo, userId, tx);
            tx.Commit();

            // Return stub DTO
            return (new VisitaListItemDto
            {
                VisitaId = visitaId,
                VisitanteNombre = request.VisitanteNombre,
                CasaId = request.CasaId,
                TipoIdentificacion = request.TipoIdentificacion,
                NumeroIdentificacion = request.NumeroIdentificacion,
                FechaEntrada = DateTime.UtcNow,
                Autorizado = false,
            }, null, 201, null);
        }
        catch
        {
            tx.Rollback();
            throw;
        }
    }

    // ── Registrar salida ─────────────────────────────────────────────────────
    public async Task<(bool Ok, string? Code, int Status, string? Detail)> RegistrarSalidaAsync(
        int visitaId, string correo, int userId, CancellationToken ct = default)
    {
        if (db.State != ConnectionState.Open) db.Open();
        using var tx = db.BeginTransaction();
        try
        {
            var ok = await repo.RegistrarSalidaAsync(visitaId, correo, userId, tx);
            if (!ok) { tx.Rollback(); return (false, "VTS_NOT_FOUND_OR_SALIDA", 404, "Visita no encontrada o ya registró salida."); }
            tx.Commit();
            return (true, null, 204, null);
        }
        catch
        {
            tx.Rollback();
            throw;
        }
    }

    // ── Crear reservación ────────────────────────────────────────────────────
    public Task<(ReservacionAreaDto? Reservacion, string? Code, int Status, string? Detail)> CrearReservacionAsync(
        CrearReservacionRequest request, string correo, int userId, CancellationToken ct = default)
        => CrearReservacionInternaAsync(request, userId, userId, correo, ct);

    public Task<(ReservacionAreaDto? Reservacion, string? Code, int Status, string? Detail)> CrearReservacionAdminAsync(
        CrearReservacionAdminRequest request, string correoAdmin, int adminUserId, CancellationToken ct = default)
    {
        if (request.UsuarioId <= 0)
            return Task.FromResult<(ReservacionAreaDto?, string?, int, string?)>(
                (null, "VTS_USUARIO_REQUERIDO", StatusCodes.Status400BadRequest, "Selecciona el residente de la reserva."));

        var baseReq = new CrearReservacionRequest
        {
            AreaComunId = request.AreaComunId,
            FechaInicio = request.FechaInicio,
            FechaFin = request.FechaFin,
        };
        return CrearReservacionInternaAsync(baseReq, request.UsuarioId, adminUserId, correoAdmin, ct);
    }

    private async Task<(ReservacionAreaDto? Reservacion, string? Code, int Status, string? Detail)> CrearReservacionInternaAsync(
        CrearReservacionRequest request,
        int residentUserId,
        int actorUserId,
        string correoActor,
        CancellationToken ct)
    {
        if (request.AreaComunId <= 0)
            return (null, "VTS_AREA_INVALIDA", 422, "El área común es requerida.");
        if (request.FechaFin <= request.FechaInicio)
            return (null, "VTS_FECHAS_INVALIDAS", 422, "La fecha fin debe ser posterior a la fecha inicio.");

        var area = await repo.ObtenerAreaAsync(request.AreaComunId, ct);
        if (area is null)
            return (null, "VTS_AREA_NO_ENCONTRADA", 404, "Área común no encontrada.");
        if (!area.RequiereReservacion)
            return (null, "VTS_AREA_NO_RESERVABLE", 422, "Esta área no requiere reservación.");

        if (db.State != ConnectionState.Open) db.Open();
        using var tx = db.BeginTransaction();
        try
        {
            var solapamiento = await repo.HaySolapamientoAsync(request.AreaComunId, request.FechaInicio, request.FechaFin, null, tx);
            if (solapamiento)
            {
                tx.Rollback();
                return (null, "VTS_SOLAPAMIENTO", 409, "El área ya está reservada en ese rango de fechas.");
            }

            var estadoId = await repo.ResolverEstadoReservacionIdAsync("Pendiente", tx)
                ?? await repo.ResolverEstadoReservacionIdAsync("Confirmada", tx);
            if (estadoId is null)
            {
                tx.Rollback();
                return (null, "VTS_ESTADO_INVALIDO", 500, "No se encontró estado 'Pendiente' o 'Confirmada'.");
            }

            var newId = await repo.InsertReservacionAsync(request, estadoId.Value, correoActor, residentUserId, actorUserId, tx);
            tx.Commit();

            var dto = await repo.ObtenerReservacionAsync(newId, ct);
            return (dto, null, 201, null);
        }
        catch
        {
            tx.Rollback();
            throw;
        }
    }

    public Task<IReadOnlyList<TipoIdentificacionDto>> ListarTiposIdentificacionAsync(CancellationToken ct = default)
        => repo.ListarTiposIdentificacionAsync(ct);

    public async Task<(TipoIdentificacionDto? Data, string? Code, int Status, string? Detail)> CrearTipoIdentificacionAsync(
        string tipo, string correo, int userId, CancellationToken ct = default)
    {
        var nombre = tipo.Trim();
        if (string.IsNullOrEmpty(nombre))
            return (null, "TIPO_IDENT_REQUERIDO", StatusCodes.Status400BadRequest, "El nombre del tipo es requerido.");

        try
        {
            var id = await repo.InsertTipoIdentificacionAsync(nombre, correo, userId);
            return (new TipoIdentificacionDto { TipoIdentificacionId = id, TipoIdentificacion = nombre },
                null, StatusCodes.Status201Created, null);
        }
        catch (Microsoft.Data.SqlClient.SqlException ex) when (ex.Number is 2627 or 2601)
        {
            return (null, "TIPO_IDENT_DUPLICADO", StatusCodes.Status409Conflict, "Ya existe ese tipo de identificación.");
        }
    }

    public async Task<(TipoIdentificacionDto? Data, string? Code, int Status, string? Detail)> ActualizarTipoIdentificacionAsync(
        int tipoId, string tipo, string correo, int userId, CancellationToken ct = default)
    {
        var nombre = tipo.Trim();
        if (string.IsNullOrEmpty(nombre))
            return (null, "TIPO_IDENT_REQUERIDO", StatusCodes.Status400BadRequest, "El nombre del tipo es requerido.");

        try
        {
            var ok = await repo.UpdateTipoIdentificacionAsync(tipoId, nombre, correo, userId);
            if (!ok)
                return (null, "TIPO_IDENT_NO_ENCONTRADO", StatusCodes.Status404NotFound, "Tipo de identificación no encontrado.");
            return (new TipoIdentificacionDto { TipoIdentificacionId = tipoId, TipoIdentificacion = nombre },
                null, StatusCodes.Status200OK, null);
        }
        catch (Microsoft.Data.SqlClient.SqlException ex) when (ex.Number is 2627 or 2601)
        {
            return (null, "TIPO_IDENT_DUPLICADO", StatusCodes.Status409Conflict, "Ya existe ese tipo de identificación.");
        }
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarTipoIdentificacionAsync(
        int tipoId, string correo, int userId, CancellationToken ct = default)
    {
        var ok = await repo.SoftDeleteTipoIdentificacionAsync(tipoId, correo, userId);
        if (!ok)
            return (false, "TIPO_IDENT_NO_ENCONTRADO", StatusCodes.Status404NotFound, "Tipo de identificación no encontrado.");
        return (true, null, StatusCodes.Status204NoContent, null);
    }

    public async Task<(AreaComunDto? Data, string? Code, int Status, string? Detail)> CrearAreaComunAsync(
        AreaComunUpsertRequest request, string correo, int userId, CancellationToken ct = default)
    {
        var nombre = request.Nombre.Trim();
        if (string.IsNullOrEmpty(nombre))
            return (null, "VTS_AREA_NOMBRE_REQUERIDO", StatusCodes.Status400BadRequest, "El nombre del área es requerido.");

        var id = await repo.InsertAreaComunAsync(
            new AreaComunUpsertRequest
            {
                Nombre = nombre,
                Descripcion = request.Descripcion,
                Capacidad = request.Capacidad,
                RequiereReservacion = request.RequiereReservacion,
            },
            correo,
            userId);
        var created = await repo.ObtenerAreaAsync(id, ct);
        return (created, null, StatusCodes.Status201Created, null);
    }

    public async Task<(AreaComunDto? Data, string? Code, int Status, string? Detail)> ActualizarAreaComunAsync(
        int areaComunId, AreaComunUpsertRequest request, string correo, int userId, CancellationToken ct = default)
    {
        if (areaComunId <= 0)
            return (null, "VTS_AREA_INVALIDA", StatusCodes.Status400BadRequest, "Identificador de área inválido.");
        var nombre = request.Nombre.Trim();
        if (string.IsNullOrEmpty(nombre))
            return (null, "VTS_AREA_NOMBRE_REQUERIDO", StatusCodes.Status400BadRequest, "El nombre del área es requerido.");

        var ok = await repo.UpdateAreaComunAsync(
            areaComunId,
            new AreaComunUpsertRequest
            {
                Nombre = nombre,
                Descripcion = request.Descripcion,
                Capacidad = request.Capacidad,
                RequiereReservacion = request.RequiereReservacion,
            },
            correo,
            userId);
        if (!ok)
            return (null, "VTS_AREA_NO_ENCONTRADA", StatusCodes.Status404NotFound, "Área común no encontrada.");
        var updated = await repo.ObtenerAreaAsync(areaComunId, ct);
        return (updated, null, StatusCodes.Status200OK, null);
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarAreaComunAsync(
        int areaComunId, string correo, int userId, CancellationToken ct = default)
    {
        if (areaComunId <= 0)
            return (false, "VTS_AREA_INVALIDA", StatusCodes.Status400BadRequest, "Identificador de área inválido.");
        var ok = await repo.SoftDeleteAreaComunAsync(areaComunId, correo, userId);
        if (!ok)
            return (false, "VTS_AREA_NO_ENCONTRADA", StatusCodes.Status404NotFound, "Área común no encontrada.");
        return (true, null, StatusCodes.Status204NoContent, null);
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> CancelarReservacionAdminAsync(
        int reservacionAreaId, string correo, int userId, CancellationToken ct = default)
    {
        if (reservacionAreaId <= 0)
            return (false, "VTS_RESERVA_INVALIDA", StatusCodes.Status400BadRequest, "Identificador de reservación inválido.");
        var ok = await repo.CancelarReservacionAsync(reservacionAreaId, correo, userId);
        if (!ok)
            return (false, "VTS_RESERVA_NO_ENCONTRADA", StatusCodes.Status404NotFound, "Reservación no encontrada o estado Cancelada no configurado.");
        return (true, null, StatusCodes.Status204NoContent, null);
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> ActualizarEstadoReservacionAdminAsync(
        int reservacionAreaId, string estado, string correo, int userId, CancellationToken ct = default)
    {
        if (reservacionAreaId <= 0)
            return (false, "VTS_RESERVA_INVALIDA", StatusCodes.Status400BadRequest, "Identificador de reservación inválido.");
        if (estado is not ("Pendiente" or "Confirmada"))
            return (false, "VTS_ESTADO_INVALIDO", StatusCodes.Status422UnprocessableEntity, "Solo se permite Pendiente o Confirmada.");

        var ok = await repo.ActualizarEstadoReservacionAsync(reservacionAreaId, estado, correo, userId);
        if (!ok)
            return (false, "VTS_RESERVA_NO_ENCONTRADA", StatusCodes.Status404NotFound, "Reservación no encontrada o ya cancelada.");
        return (true, null, StatusCodes.Status204NoContent, null);
    }
}
