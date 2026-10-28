using System.Data;
using GraphApi.Models.VTS.CuartaVisitas;
using GraphApi.Repositories.VTS;

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
    public async Task<(ReservacionAreaDto? Reservacion, string? Code, int Status, string? Detail)> CrearReservacionAsync(
        CrearReservacionRequest request, string correo, int userId, CancellationToken ct = default)
    {
        if (request.FechaFin <= request.FechaInicio)
            return (null, "VTS_FECHAS_INVALIDAS", 422, "La fecha fin debe ser posterior a la fecha inicio.");

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

            await repo.InsertReservacionAsync(request, estadoId.Value, correo, userId, tx);
            tx.Commit();

            var mias = await repo.ListarReservacionesMiasAsync(userId, ct);
            var nueva = mias.FirstOrDefault(r => r.AreaComunId == request.AreaComunId
                && r.FechaInicio == request.FechaInicio
                && r.FechaFin == request.FechaFin);

            return (nueva, null, 201, null);
        }
        catch
        {
            tx.Rollback();
            throw;
        }
    }
}
