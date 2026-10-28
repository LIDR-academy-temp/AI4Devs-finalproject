using System.Data;
using Dapper;
using GraphApi.Infrastructure;
using GraphApi.Models.VTS.CuartaVisitas;

namespace GraphApi.Repositories.VTS;

public sealed class CuartaVisitasRepository(IDbConnection db) : ICuartaVisitasRepository
{
    private string? _numeroCasaSelect;
    private string NumeroCasaSelect => _numeroCasaSelect ??= SqlSchemaCompat.CasaNumeroSelect(db, "c");

    // ── Visitas ──────────────────────────────────────────────────────────────
    public async Task<IReadOnlyList<VisitaListItemDto>> ListarVisitasAsync(
        int? casaId, DateTime? desde, DateTime? hasta, CancellationToken ct = default)
    {
        var sql = $"""
            SELECT v.VisitaID              AS VisitaId,
                   v.VisitanteNombre,
                   v.CasaID               AS CasaId,
                   {NumeroCasaSelect}     AS NumeroCasa,
                   ti.TipoIdentificacion,
                   v.NumeroIdentificacion,
                   v.FechaEntrada,
                   v.FechaSalida,
                   v.Autorizado
            FROM   vts.Visitas v
            JOIN   vts.TipoIdentificacion ti ON ti.TipoIdentificacionID = v.TipoIdentificacionID
            LEFT   JOIN sgr.Casas c ON c.CasaID = v.CasaID
            WHERE  v.bEliminado = 0
              AND  (@CasaId IS NULL OR v.CasaID = @CasaId)
              AND  (@Desde  IS NULL OR v.FechaEntrada >= @Desde)
              AND  (@Hasta  IS NULL OR v.FechaEntrada <= @Hasta)
            ORDER  BY v.FechaEntrada DESC
            """;
        var rows = await db.QueryAsync<VisitaListItemDto>(
            new CommandDefinition(sql, new { CasaId = casaId, Desde = desde, Hasta = hasta }, cancellationToken: ct));
        return rows.AsList();
    }

    public async Task<int?> ResolverTipoIdentificacionIdAsync(string tipoIdentificacion, IDbTransaction? tx = null)
    {
        const string sql = "SELECT TOP 1 TipoIdentificacionID FROM vts.TipoIdentificacion WHERE TipoIdentificacion = @v AND bEliminado = 0";
        return await db.ExecuteScalarAsync<int?>(sql, new { v = tipoIdentificacion }, tx);
    }

    public async Task<int> InsertVisitaAsync(
        RegistrarVisitaRequest request,
        int tipoIdentificacionId,
        string correo,
        int userId,
        IDbTransaction tx)
    {
        const string sql = """
            INSERT INTO vts.Visitas
                (VisitanteNombre, UsuarioVisitadoID, CasaID,
                 TipoIdentificacionID, NumeroIdentificacion,
                 FechaEntrada, Autorizado,
                 Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            VALUES
                (@VisitanteNombre, @UsuarioVisitadoId, @CasaId,
                 @TipoIdentificacionId, @NumeroIdentificacion,
                 GETDATE(), 0,
                 @Correo, @UserId, GETDATE(), 0);
            SELECT CAST(SCOPE_IDENTITY() AS int);
            """;
        return await db.ExecuteScalarAsync<int>(sql, new
        {
            request.VisitanteNombre,
            request.UsuarioVisitadoId,
            request.CasaId,
            TipoIdentificacionId = tipoIdentificacionId,
            request.NumeroIdentificacion,
            Correo = correo,
            UserId = userId,
        }, tx);
    }

    public async Task<bool> RegistrarSalidaAsync(int visitaId, string correo, int userId, IDbTransaction tx)
    {
        const string sql = """
            UPDATE vts.Visitas
            SET    FechaSalida = GETDATE(),
                   Modificado = @Correo,
                   UsuarioModificacionID = @UserId,
                   FechaModificacion = GETDATE()
            WHERE  VisitaID = @VisitaId AND bEliminado = 0 AND FechaSalida IS NULL
            """;
        return await db.ExecuteAsync(sql, new { VisitaId = visitaId, Correo = correo, UserId = userId }, tx) > 0;
    }

    // ── Áreas comunes ────────────────────────────────────────────────────────
    public async Task<IReadOnlyList<AreaComunDto>> ListarAreasAsync(CancellationToken ct = default)
    {
        const string sql = """
            SELECT AreasComunesID    AS AreaComunId,
                   AreasComunes     AS Nombre,
                   DescripcionAreasComunes AS Descripcion,
                   Capacidad,
                   RequiereReservacion
            FROM   vts.AreasComunes
            WHERE  bEliminado = 0
            ORDER  BY Nombre
            """;
        var rows = await db.QueryAsync<AreaComunDto>(new CommandDefinition(sql, cancellationToken: ct));
        return rows.AsList();
    }

    // ── Reservaciones ────────────────────────────────────────────────────────
    public async Task<bool> HaySolapamientoAsync(
        int areaComunId, DateTime inicio, DateTime fin, int? excluirId = null, IDbTransaction? tx = null)
    {
        const string sql = """
            SELECT COUNT(1) FROM vts.ReservacionesArea r
            JOIN   vts.ReservacionesEstados e ON e.ReservacionEstadoID = r.ReservacionEstadoID
            WHERE  r.AreasComunesID = @AreaComunId
              AND  r.bEliminado    = 0
              AND  e.ReservacionEstado NOT IN ('Cancelada')
              AND  (@ExcluirId IS NULL OR r.ReservacionAreaID <> @ExcluirId)
              AND  r.FechaInicio < @Fin
              AND  r.FechaFin    > @Inicio
            """;
        var count = await db.ExecuteScalarAsync<int>(sql, new { AreaComunId = areaComunId, Inicio = inicio, Fin = fin, ExcluirId = excluirId }, tx);
        return count > 0;
    }

    public async Task<int?> ResolverEstadoReservacionIdAsync(string estado, IDbTransaction? tx = null)
    {
        const string sql = "SELECT TOP 1 ReservacionEstadoID FROM vts.ReservacionesEstados WHERE ReservacionEstado = @v AND bEliminado = 0";
        return await db.ExecuteScalarAsync<int?>(sql, new { v = estado }, tx);
    }

    public async Task<int> InsertReservacionAsync(
        CrearReservacionRequest request,
        int estadoId,
        string correo,
        int userId,
        IDbTransaction tx)
    {
        const string sql = """
            INSERT INTO vts.ReservacionesArea
                (AreasComunesID, UsuarioID, FechaInicio, FechaFin,
                 ReservacionEstadoID, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            VALUES
                (@AreaComunId, @UserId, @FechaInicio, @FechaFin,
                 @EstadoId, @Correo, @UserId, GETDATE(), 0);
            SELECT CAST(SCOPE_IDENTITY() AS int);
            """;
        return await db.ExecuteScalarAsync<int>(sql, new
        {
            AreaComunId = request.AreaComunId,
            UserId = userId,
            request.FechaInicio,
            request.FechaFin,
            EstadoId = estadoId,
            Correo = correo,
        }, tx);
    }

    public async Task<IReadOnlyList<ReservacionAreaDto>> ListarReservacionesMiasAsync(
        int userId, CancellationToken ct = default)
    {
        const string sql = """
            SELECT r.ReservacionAreaID AS ReservacionAreaId,
                   r.AreasComunesID   AS AreaComunId,
                   a.AreasComunes     AS AreaComun,
                   r.FechaInicio,
                   r.FechaFin,
                   e.ReservacionEstado AS Estado,
                   r.FechaCreacion
            FROM   vts.ReservacionesArea r
            JOIN   vts.AreasComunes a ON a.AreasComunesID = r.AreasComunesID
            JOIN   vts.ReservacionesEstados e ON e.ReservacionEstadoID = r.ReservacionEstadoID
            WHERE  r.UsuarioID   = @UserId
              AND  r.bEliminado  = 0
            ORDER  BY r.FechaInicio DESC
            """;
        var rows = await db.QueryAsync<ReservacionAreaDto>(
            new CommandDefinition(sql, new { UserId = userId }, cancellationToken: ct));
        return rows.AsList();
    }
}
