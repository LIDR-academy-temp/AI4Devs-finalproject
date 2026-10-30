using System.Data;
using Dapper;
using GraphApi.Infrastructure;
using GraphApi.Models.TKT;
using GraphApi.Models.VTS.CuartaVisitas;

namespace GraphApi.Repositories.VTS;

public sealed class CuartaVisitasRepository(IDbConnection db) : ICuartaVisitasRepository
{
    private string? _numeroCasaSelect;
    private string NumeroCasaSelect => _numeroCasaSelect ??= SqlSchemaCompat.CasaNumeroSelect(db, "c");

    // ── Detección de esquema lazy (ADR-008): no en field init — la conexión puede no estar lista al crear el repo ──
    private string? _colAreaIdResolved;
    private string ColAreaId => _colAreaIdResolved ??= SqlSchemaCompat.HasColumn(db, "vts", "AreasComunes", "AreasComunesID")
        ? "AreasComunesID"
        : "AreaID";

    private string? _colAreaNombreResolved;
    private string ColAreaNombre => _colAreaNombreResolved ??= SqlSchemaCompat.HasColumn(db, "vts", "AreasComunes", "AreasComunes")
        ? "AreasComunes"
        : "Nombre";

    private string? _colReservAreaIdResolved;
    private string ColReservAreaId => _colReservAreaIdResolved ??= SqlSchemaCompat.HasColumn(db, "vts", "ReservacionesArea", "AreasComunesID")
        ? "AreasComunesID"
        : "AreaID";

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

    public async Task<IReadOnlyList<TipoIdentificacionDto>> ListarTiposIdentificacionAsync(CancellationToken ct = default)
    {
        const string sql = """
            SELECT TipoIdentificacionID AS TipoIdentificacionId, TipoIdentificacion
            FROM vts.TipoIdentificacion
            WHERE bEliminado = 0
            ORDER BY TipoIdentificacion;
            """;
        var rows = await db.QueryAsync<TipoIdentificacionDto>(new CommandDefinition(sql, cancellationToken: ct));
        return rows.AsList();
    }

    public async Task<int> InsertTipoIdentificacionAsync(string tipo, string correo, int userId, IDbTransaction? tx = null)
    {
        const string sql = """
            INSERT INTO vts.TipoIdentificacion
                (TipoIdentificacion, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            OUTPUT INSERTED.TipoIdentificacionID
            VALUES (@tipo, @correo, @userId, GETDATE(), 0);
            """;
        return await db.ExecuteScalarAsync<int>(sql, new { tipo, correo, userId }, tx);
    }

    public async Task<bool> UpdateTipoIdentificacionAsync(int tipoId, string tipo, string correo, int userId, IDbTransaction? tx = null)
    {
        const string sql = """
            UPDATE vts.TipoIdentificacion SET
                TipoIdentificacion = @tipo,
                Modificado = @correo,
                UsuarioModificacionID = @userId,
                FechaModificacion = GETDATE()
            WHERE TipoIdentificacionID = @tipoId AND bEliminado = 0;
            """;
        return await db.ExecuteAsync(sql, new { tipoId, tipo, correo, userId }, tx) > 0;
    }

    public async Task<bool> SoftDeleteTipoIdentificacionAsync(int tipoId, string correo, int userId, IDbTransaction? tx = null)
    {
        const string sql = """
            UPDATE vts.TipoIdentificacion SET
                bEliminado = 1,
                Modificado = @correo,
                UsuarioModificacionID = @userId,
                FechaModificacion = GETDATE()
            WHERE TipoIdentificacionID = @tipoId AND bEliminado = 0;
            """;
        return await db.ExecuteAsync(sql, new { tipoId, correo, userId }, tx) > 0;
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
        var sql = $"""
            SELECT {ColAreaId}    AS AreaComunId,
                   {ColAreaNombre}     AS Nombre,
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

    public async Task<AreaComunDto?> ObtenerAreaAsync(int areaComunId, CancellationToken ct = default)
    {
        var sql = $"""
            SELECT {ColAreaId}    AS AreaComunId,
                   {ColAreaNombre}     AS Nombre,
                   DescripcionAreasComunes AS Descripcion,
                   Capacidad,
                   RequiereReservacion
            FROM   vts.AreasComunes
            WHERE  {ColAreaId} = @AreaComunId AND bEliminado = 0
            """;
        return await db.QueryFirstOrDefaultAsync<AreaComunDto>(
            new CommandDefinition(sql, new { AreaComunId = areaComunId }, cancellationToken: ct));
    }

    public async Task<int> InsertAreaComunAsync(
        AreaComunUpsertRequest request, string correo, int userId, IDbTransaction? tx = null)
    {
        var sql = $"""
            INSERT INTO vts.AreasComunes
                ({ColAreaNombre}, DescripcionAreasComunes, Capacidad, RequiereReservacion,
                 Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            VALUES
                (@Nombre, @Descripcion, @Capacidad, @RequiereReservacion,
                 @Correo, @UserId, GETDATE(), 0);
            SELECT CAST(SCOPE_IDENTITY() AS int);
            """;
        return await db.ExecuteScalarAsync<int>(sql, new
        {
            Nombre = request.Nombre.Trim(),
            request.Descripcion,
            request.Capacidad,
            request.RequiereReservacion,
            Correo = correo,
            UserId = userId,
        }, tx);
    }

    public async Task<bool> UpdateAreaComunAsync(
        int areaComunId, AreaComunUpsertRequest request, string correo, int userId, IDbTransaction? tx = null)
    {
        var sql = $"""
            UPDATE vts.AreasComunes SET
                {ColAreaNombre} = @Nombre,
                DescripcionAreasComunes = @Descripcion,
                Capacidad = @Capacidad,
                RequiereReservacion = @RequiereReservacion,
                Modificado = @Correo,
                UsuarioModificacionID = @UserId,
                FechaModificacion = GETDATE()
            WHERE {ColAreaId} = @AreaComunId AND bEliminado = 0;
            """;
        return await db.ExecuteAsync(sql, new
        {
            AreaComunId = areaComunId,
            Nombre = request.Nombre.Trim(),
            request.Descripcion,
            request.Capacidad,
            request.RequiereReservacion,
            Correo = correo,
            UserId = userId,
        }, tx) > 0;
    }

    public async Task<bool> SoftDeleteAreaComunAsync(
        int areaComunId, string correo, int userId, IDbTransaction? tx = null)
    {
        var sql = $"""
            UPDATE vts.AreasComunes SET
                bEliminado = 1,
                Modificado = @Correo,
                UsuarioModificacionID = @UserId,
                FechaModificacion = GETDATE()
            WHERE {ColAreaId} = @AreaComunId AND bEliminado = 0;
            """;
        return await db.ExecuteAsync(sql, new { AreaComunId = areaComunId, Correo = correo, UserId = userId }, tx) > 0;
    }

    public async Task<bool> CancelarReservacionAsync(
        int reservacionAreaId, string correo, int userId, IDbTransaction? tx = null)
    {
        var estadoId = await ResolverEstadoReservacionIdAsync("Cancelada", tx);
        if (estadoId is null)
            return false;

        const string sql = """
            UPDATE vts.ReservacionesArea SET
                ReservacionEstadoID = @EstadoId,
                Modificado = @Correo,
                UsuarioModificacionID = @UserId,
                FechaModificacion = GETDATE()
            WHERE ReservacionAreaID = @ReservacionAreaId AND bEliminado = 0;
            """;
        return await db.ExecuteAsync(sql, new
        {
            ReservacionAreaId = reservacionAreaId,
            EstadoId = estadoId.Value,
            Correo = correo,
            UserId = userId,
        }, tx) > 0;
    }

    public async Task<bool> ActualizarEstadoReservacionAsync(
        int reservacionAreaId, string estadoNombre, string correo, int userId, IDbTransaction? tx = null)
    {
        var estadoId = await ResolverEstadoReservacionIdAsync(estadoNombre, tx);
        if (estadoId is null)
            return false;

        const string sql = """
            UPDATE r SET
                ReservacionEstadoID = @EstadoId,
                Modificado = @Correo,
                UsuarioModificacionID = @UserId,
                FechaModificacion = GETDATE()
            FROM vts.ReservacionesArea r
            INNER JOIN vts.ReservacionesEstados e ON e.ReservacionEstadoID = r.ReservacionEstadoID
            WHERE r.ReservacionAreaID = @ReservacionAreaId
              AND r.bEliminado = 0
              AND e.ReservacionEstado <> 'Cancelada';
            """;
        return await db.ExecuteAsync(sql, new
        {
            ReservacionAreaId = reservacionAreaId,
            EstadoId = estadoId.Value,
            Correo = correo,
            UserId = userId,
        }, tx) > 0;
    }

    // ── Reservaciones ────────────────────────────────────────────────────────
    public async Task<bool> HaySolapamientoAsync(
        int areaComunId, DateTime inicio, DateTime fin, int? excluirId = null, IDbTransaction? tx = null)
    {
        var sql = $"""
            SELECT COUNT(1) FROM vts.ReservacionesArea r
            JOIN   vts.ReservacionesEstados e ON e.ReservacionEstadoID = r.ReservacionEstadoID
            WHERE  r.{ColReservAreaId} = @AreaComunId
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
        string correoActor,
        int residentUserId,
        int actorUserId,
        IDbTransaction tx)
    {
        var sql = $"""
            INSERT INTO vts.ReservacionesArea
                ({ColReservAreaId}, UsuarioID, FechaInicio, FechaFin,
                 ReservacionEstadoID, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            VALUES
                (@AreaComunId, @ResidentUserId, @FechaInicio, @FechaFin,
                 @EstadoId, @Correo, @ActorUserId, GETDATE(), 0);
            SELECT CAST(SCOPE_IDENTITY() AS int);
            """;
        return await db.ExecuteScalarAsync<int>(sql, new
        {
            AreaComunId = request.AreaComunId,
            ResidentUserId = residentUserId,
            request.FechaInicio,
            request.FechaFin,
            EstadoId = estadoId,
            Correo = correoActor,
            ActorUserId = actorUserId,
        }, tx);
    }

    public async Task<ReservacionAreaDto?> ObtenerReservacionAsync(int reservacionAreaId, CancellationToken ct = default)
    {
        var sql = $"""
            SELECT r.ReservacionAreaID AS ReservacionAreaId,
                   r.{ColReservAreaId}   AS AreaComunId,
                   a.{ColAreaNombre}     AS AreaComun,
                   r.FechaInicio,
                   r.FechaFin,
                   e.ReservacionEstado AS Estado,
                   r.FechaCreacion
            FROM   vts.ReservacionesArea r
            JOIN   vts.AreasComunes a ON a.{ColAreaId} = r.{ColReservAreaId}
            JOIN   vts.ReservacionesEstados e ON e.ReservacionEstadoID = r.ReservacionEstadoID
            WHERE  r.ReservacionAreaID = @ReservacionAreaId AND r.bEliminado = 0
            """;
        return await db.QueryFirstOrDefaultAsync<ReservacionAreaDto>(
            new CommandDefinition(sql, new { ReservacionAreaId = reservacionAreaId }, cancellationToken: ct));
    }

    public async Task<IReadOnlyList<ReservacionAreaDto>> ListarReservacionesMiasAsync(
        int userId, CancellationToken ct = default)
    {
        var sql = $"""
            SELECT r.ReservacionAreaID AS ReservacionAreaId,
                   r.{ColReservAreaId}   AS AreaComunId,
                   a.{ColAreaNombre}     AS AreaComun,
                   r.FechaInicio,
                   r.FechaFin,
                   e.ReservacionEstado AS Estado,
                   r.FechaCreacion
            FROM   vts.ReservacionesArea r
            JOIN   vts.AreasComunes a ON a.{ColAreaId} = r.{ColReservAreaId}
            JOIN   vts.ReservacionesEstados e ON e.ReservacionEstadoID = r.ReservacionEstadoID
            WHERE  r.UsuarioID   = @UserId
              AND  r.bEliminado  = 0
            ORDER  BY r.FechaInicio DESC
            """;
        var rows = await db.QueryAsync<ReservacionAreaDto>(
            new CommandDefinition(sql, new { UserId = userId }, cancellationToken: ct));
        return rows.AsList();
    }

    public async Task<IReadOnlyList<ReservacionCalendarioDto>> ListarReservacionesCalendarioAsync(
        int? areaComunId, DateTime desde, DateTime hasta, CancellationToken ct = default)
    {
        var sql = $"""
            SELECT r.ReservacionAreaID AS ReservacionAreaId,
                   r.{ColReservAreaId}   AS AreaComunId,
                   r.FechaInicio,
                   r.FechaFin,
                   e.ReservacionEstado AS Estado,
                   a.{ColAreaNombre} + N' (Reservado)' AS Etiqueta
            FROM   vts.ReservacionesArea r
            JOIN   vts.AreasComunes a ON a.{ColAreaId} = r.{ColReservAreaId}
            JOIN   vts.ReservacionesEstados e ON e.ReservacionEstadoID = r.ReservacionEstadoID
            WHERE  r.bEliminado = 0
              AND  a.bEliminado = 0
              AND  e.ReservacionEstado NOT IN ('Cancelada')
              AND  r.FechaFin    > @Desde
              AND  r.FechaInicio < @Hasta
              AND  (@AreaComunId IS NULL OR r.{ColReservAreaId} = @AreaComunId)
              AND  (@AreaComunId IS NOT NULL OR a.RequiereReservacion = 1)
            ORDER  BY r.FechaInicio
            """;
        var rows = await db.QueryAsync<ReservacionCalendarioDto>(
            new CommandDefinition(sql, new { AreaComunId = areaComunId, Desde = desde, Hasta = hasta }, cancellationToken: ct));
        return rows.AsList();
    }

    public async Task<PaginaDto<ReservacionAdminItemDto>> ListarReservacionesAdminAsync(
        ReservacionAdminFiltroDto filtro, CancellationToken ct = default)
    {
        var offset = (filtro.Pagina - 1) * filtro.Tamano;
        const string sql = """
            SELECT COUNT(1)
            FROM   vts.vsReservacionesArea v WITH (NOLOCK)
            WHERE  v.bEliminado = 0
              AND  (@AreaComunId IS NULL OR v.AreasComunesID = @AreaComunId)
              AND  (@Desde IS NULL OR v.FechaFin > @Desde)
              AND  (@Hasta IS NULL OR v.FechaInicio < @Hasta);

            SELECT v.ReservacionAreaID AS ReservacionAreaId,
                   v.AreasComunesID   AS AreaComunId,
                   v.AreasComunes     AS AreaComun,
                   v.UsuarioID        AS UsuarioId,
                   v.NombreUsuario    AS UsuarioNombre,
                   v.CorreoUsuario    AS UsuarioCorreo,
                   v.FechaInicio,
                   v.FechaFin,
                   v.ReservacionEstado AS Estado
            FROM   vts.vsReservacionesArea v WITH (NOLOCK)
            WHERE  v.bEliminado = 0
              AND  (@AreaComunId IS NULL OR v.AreasComunesID = @AreaComunId)
              AND  (@Desde IS NULL OR v.FechaFin > @Desde)
              AND  (@Hasta IS NULL OR v.FechaInicio < @Hasta)
            ORDER  BY v.FechaInicio DESC, v.ReservacionAreaID DESC
            OFFSET @Offset ROWS FETCH NEXT @Tamano ROWS ONLY;
            """;

        using var multi = await db.QueryMultipleAsync(
            new CommandDefinition(
                sql,
                new
                {
                    filtro.AreaComunId,
                    filtro.Desde,
                    filtro.Hasta,
                    Offset = offset,
                    Tamano = filtro.Tamano,
                },
                cancellationToken: ct));

        var total = await multi.ReadSingleAsync<int>();
        var items = (await multi.ReadAsync<ReservacionAdminItemDto>()).ToList();

        return new PaginaDto<ReservacionAdminItemDto>
        {
            Total = total,
            Pagina = filtro.Pagina,
            Items = items,
        };
    }
}
