using System.Data;
using Dapper;
using GraphApi.Infrastructure;
using GraphApi.Models.TKT;

namespace GraphApi.Repositories.TKT;

public sealed class CuartaTicketAdminRepository : ICuartaTicketAdminRepository
{
    private readonly IDbConnection _db;
    private readonly bool _hasEsInterno;
    private readonly bool _hasExtendedColumns;

    public CuartaTicketAdminRepository(IDbConnection db)
    {
        _db = db;
        _hasExtendedColumns = ColumnExists("tkt", "Tickets", "CategoriaTicketID");
        _hasEsInterno = _db.QuerySingleOrDefault<int?>(
            """
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA='tkt' AND TABLE_NAME='ComentariosTicket' AND COLUMN_NAME='EsInterno';
            """) == 1;
    }

    public async Task<PaginaDto<AdminTicketItemDto>> ListarAsync(
        TicketFiltroDto filtro,
        int? prioridadTicketId,
        CancellationToken ct = default)
    {
        var offset = (filtro.Pagina - 1) * filtro.Tamano;
        const string sql = """
            SELECT COUNT(*)
            FROM tkt.vsTickets WITH (NOLOCK)
            WHERE bEliminado = 0
              AND (@EstadoTicketId IS NULL OR EstadoTicketID = @EstadoTicketId)
              AND (@PrioridadTicketId IS NULL OR PrioridadTicketID = @PrioridadTicketId);

            SELECT TicketID AS TicketId,
                   TituloTicket AS Titulo,
                   EstadoTicket AS Estado,
                   PrioridadTicket AS Prioridad,
                   CAST(NULL AS NVARCHAR(100)) AS Categoria,
                   NombreSolicitante AS Solicitante,
                   FechaCreacionTicket AS FechaCreacion
            FROM tkt.vsTickets WITH (NOLOCK)
            WHERE bEliminado = 0
              AND (@EstadoTicketId IS NULL OR EstadoTicketID = @EstadoTicketId)
              AND (@PrioridadTicketId IS NULL OR PrioridadTicketID = @PrioridadTicketId)
            ORDER BY FechaCreacionTicket DESC, TicketID DESC
            OFFSET @Offset ROWS FETCH NEXT @Tamano ROWS ONLY;
            """;

        using var multi = await _db.QueryMultipleAsync(
            new CommandDefinition(
                sql,
                new
                {
                    filtro.EstadoTicketId,
                    PrioridadTicketId = prioridadTicketId,
                    Offset = offset,
                    Tamano = filtro.Tamano,
                },
                cancellationToken: ct));

        var total = await multi.ReadSingleAsync<int>();
        var items = (await multi.ReadAsync<AdminTicketItemDto>()).ToList();
        return new PaginaDto<AdminTicketItemDto> { Total = total, Pagina = filtro.Pagina, Items = items };
    }

    public async Task<(int TicketId, int EstadoActualId, string EstadoActual, int SolicitanteId, string Titulo)?> GetTicketEstadoAsync(
        int ticketId,
        IDbTransaction tx)
    {
        const string sql = """
            SELECT t.TicketID, t.EstadoTicketID, e.EstadoTicket, t.UsuarioSolicitanteID, t.Titulo AS Titulo
            FROM tkt.Tickets t
            INNER JOIN tkt.EstadosTickets e ON e.EstadoTicketID = t.EstadoTicketID
            WHERE t.TicketID = @TicketId AND t.bEliminado = 0;
            """;

        var row = await _db.QuerySingleOrDefaultAsync<dynamic>(sql, new { TicketId = ticketId }, tx);
        if (row is null)
        {
            return null;
        }

        return ((int)row.TicketID, (int)row.EstadoTicketID, (string)row.EstadoTicket,
            (int)row.UsuarioSolicitanteID, (string)row.Titulo);
    }

    public Task<string?> GetEstadoNombreAsync(int estadoId, IDbTransaction tx) =>
        _db.QuerySingleOrDefaultAsync<string?>(
            "SELECT EstadoTicket FROM tkt.EstadosTickets WHERE EstadoTicketID = @Id AND bEliminado = 0;",
            new { Id = estadoId },
            tx);

    public async Task<int> UpdateEstadoAsync(
        int ticketId,
        int estadoActualId,
        int estadoDestinoId,
        string estadoDestinoNombre,
        string modificadoCorreo,
        int modificadoPorId,
        IDbTransaction tx)
    {
        var fechaCierreSql = estadoDestinoNombre.Equals("Resuelto", StringComparison.OrdinalIgnoreCase)
            ? ", FechaCierre = SYSUTCDATETIME()"
            : estadoDestinoNombre.Equals("En seguimiento", StringComparison.OrdinalIgnoreCase)
                ? ", FechaCierre = NULL"
                : string.Empty;

        var sql = $"""
            UPDATE tkt.Tickets
               SET EstadoTicketID = @EstadoDestinoId,
                   Modificado = @Correo,
                   UsuarioModificacionID = @UsuarioId,
                   FechaModificacion = SYSUTCDATETIME()
                   {fechaCierreSql}
             WHERE TicketID = @TicketId
               AND EstadoTicketID = @EstadoActualId
               AND bEliminado = 0;
            """;

        return await _db.ExecuteAsync(sql, new
        {
            TicketId = ticketId,
            EstadoDestinoId = estadoDestinoId,
            EstadoActualId = estadoActualId,
            Correo = modificadoCorreo,
            UsuarioId = modificadoPorId,
        }, tx);
    }

    public async Task InsertComentarioSistemaAsync(
        int ticketId,
        int usuarioId,
        string texto,
        string correo,
        IDbTransaction tx)
    {
        if (!_hasEsInterno)
        {
            return;
        }

        const string sql = """
            INSERT INTO tkt.ComentariosTicket
                (TicketID, UsuarioID, Comentario, EsInterno, FechaComentario,
                 Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            VALUES
                (@TicketId, @UsuarioId, @Texto, 1, SYSUTCDATETIME(),
                 @Correo, @UsuarioId, SYSUTCDATETIME(), 0);
            """;

        await _db.ExecuteAsync(sql, new
        {
            TicketId = ticketId,
            UsuarioId = usuarioId,
            Texto = texto,
            Correo = correo,
        }, tx);
    }

    public async Task<bool> IsAsignadoActivoAsync(int ticketId, int usuarioId, IDbTransaction tx)
    {
        var v = await _db.ExecuteScalarAsync<int>(
            """
            SELECT CASE WHEN EXISTS (
                SELECT 1 FROM tkt.TicketsUsuariosAsignados
                WHERE TicketID = @TicketId AND UsuarioID = @UsuarioId
                  AND Terminado = 0 AND bEliminado = 0) THEN 1 ELSE 0 END;
            """,
            new { TicketId = ticketId, UsuarioId = usuarioId },
            tx);
        return v is 1;
    }

    public Task<bool> ExistsAsignacionActivaAsync(int ticketId, int usuarioId, IDbTransaction tx) =>
        IsAsignadoActivoAsync(ticketId, usuarioId, tx);

    public async Task<int> InsertAsignacionAsync(int ticketId, int usuarioId, string creadoCorreo, int creadoPorId, IDbTransaction tx)
    {
        const string sql = """
            INSERT INTO tkt.TicketsUsuariosAsignados
                (TicketID, UsuarioID, Terminado, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            VALUES
                (@TicketId, @UsuarioId, 0, @Correo, @CreadoPorId, SYSUTCDATETIME(), 0);
            SELECT CAST(SCOPE_IDENTITY() AS INT);
            """;

        return await _db.ExecuteScalarAsync<int>(sql, new
        {
            TicketId = ticketId,
            UsuarioId = usuarioId,
            Correo = creadoCorreo,
            CreadoPorId = creadoPorId,
        }, tx);
    }

    public async Task<bool> IsTrabajadorActivoAsync(int usuarioId, IDbTransaction tx)
    {
        var (_, _, activo) = SqlSchemaCompat.UsuarioColumns(_db, "u");
        var perfilCol = SqlSchemaCompat.PerfilNombreColumn(_db, "p");
        var sql = $"""
            SELECT CASE WHEN EXISTS (
                SELECT 1 FROM sgr.Usuarios u
                INNER JOIN sgr.Perfiles p ON p.PerfilID = u.PerfilID
                WHERE u.UsuarioID = @UsuarioId AND {activo} = 1 AND u.bEliminado = 0
                  AND {perfilCol} = N'Trabajador') THEN 1 ELSE 0 END;
            """;
        var v = await _db.ExecuteScalarAsync<int>(sql, new { UsuarioId = usuarioId }, tx);
        return v is 1;
    }

    public async Task<bool> IsResidenteActivoAsync(int usuarioId, IDbTransaction tx)
    {
        var (_, _, activo) = SqlSchemaCompat.UsuarioColumns(_db, "u");
        var perfilCol = SqlSchemaCompat.PerfilNombreColumn(_db, "p");
        var sql = $"""
            SELECT CASE WHEN EXISTS (
                SELECT 1 FROM sgr.Usuarios u
                INNER JOIN sgr.Perfiles p ON p.PerfilID = u.PerfilID
                WHERE u.UsuarioID = @UsuarioId AND {activo} = 1 AND u.bEliminado = 0
                  AND {perfilCol} = N'Residente') THEN 1 ELSE 0 END;
            """;
        var v = await _db.ExecuteScalarAsync<int>(sql, new { UsuarioId = usuarioId }, tx);
        return v is 1;
    }

    public async Task<int> UpdateMetadatosAsync(
        int ticketId,
        string titulo,
        string descripcion,
        int prioridadTicketId,
        int categoriaTicketId,
        string modificadoCorreo,
        int modificadoPorId,
        IDbTransaction tx)
    {
        if (_hasExtendedColumns)
        {
            const string sqlExt = """
                UPDATE tkt.Tickets
                   SET Titulo = @Titulo,
                       Descripcion = @Descripcion,
                       PrioridadTicketID = @PrioridadTicketId,
                       CategoriaTicketID = @CategoriaTicketId,
                       Modificado = @Correo,
                       UsuarioModificacionID = @UsuarioId,
                       FechaModificacion = SYSUTCDATETIME()
                 WHERE TicketID = @TicketId
                   AND bEliminado = 0;
                """;

            return await _db.ExecuteAsync(sqlExt, new
            {
                TicketId = ticketId,
                Titulo = titulo,
                Descripcion = descripcion,
                PrioridadTicketId = prioridadTicketId,
                CategoriaTicketId = categoriaTicketId,
                Correo = modificadoCorreo,
                UsuarioId = modificadoPorId,
            }, tx);
        }

        const string sql = """
            UPDATE tkt.Tickets
               SET Titulo = @Titulo,
                   Descripcion = @Descripcion,
                   PrioridadTicketID = @PrioridadTicketId,
                   Modificado = @Correo,
                   UsuarioModificacionID = @UsuarioId,
                   FechaModificacion = SYSUTCDATETIME()
             WHERE TicketID = @TicketId
               AND bEliminado = 0;
            """;

        return await _db.ExecuteAsync(sql, new
        {
            TicketId = ticketId,
            Titulo = titulo,
            Descripcion = descripcion,
            PrioridadTicketId = prioridadTicketId,
            Correo = modificadoCorreo,
            UsuarioId = modificadoPorId,
        }, tx);
    }

    public Task<int> SoftDeleteAsync(int ticketId, string modificadoCorreo, int modificadoPorId, IDbTransaction tx) =>
        _db.ExecuteAsync(
            """
            UPDATE tkt.Tickets
               SET bEliminado = 1,
                   Modificado = @Correo,
                   UsuarioModificacionID = @UsuarioId,
                   FechaModificacion = SYSUTCDATETIME()
             WHERE TicketID = @TicketId
               AND bEliminado = 0;
            """,
            new
            {
                TicketId = ticketId,
                Correo = modificadoCorreo,
                UsuarioId = modificadoPorId,
            },
            tx);

    public async Task<IReadOnlyList<TrabajadorItemDto>> ListarTrabajadoresAsync(CancellationToken ct = default)
    {
        var (nombre, _, activo) = SqlSchemaCompat.UsuarioColumns(_db, "u");
        var perfilCol = SqlSchemaCompat.PerfilNombreColumn(_db, "p");
        var sql = $"""
            SELECT u.UsuarioID AS Id, {nombre} AS Nombre
            FROM sgr.Usuarios u WITH (NOLOCK)
            INNER JOIN sgr.Perfiles p WITH (NOLOCK) ON p.PerfilID = u.PerfilID
            WHERE {perfilCol} = N'Trabajador' AND {activo} = 1 AND u.bEliminado = 0
            ORDER BY {nombre};
            """;

        return (await _db.QueryAsync<TrabajadorItemDto>(
            new CommandDefinition(sql, cancellationToken: ct))).ToList();
    }

    private bool ColumnExists(string schema, string table, string column)
    {
        const string sql = """
            SELECT 1
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = @Schema AND TABLE_NAME = @Table AND COLUMN_NAME = @Column;
            """;

        return _db.QuerySingleOrDefault<int?>(sql, new { Schema = schema, Table = table, Column = column }) == 1;
    }
}
