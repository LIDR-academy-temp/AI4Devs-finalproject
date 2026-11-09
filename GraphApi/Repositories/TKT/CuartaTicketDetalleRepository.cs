using System.Data;
using Dapper;
using GraphApi.Infrastructure;
using GraphApi.Models.TKT;

namespace GraphApi.Repositories.TKT;

public sealed class CuartaTicketDetalleRepository : ICuartaTicketDetalleRepository
{
    private readonly IDbConnection _db;
    private readonly bool _hasEsInterno;
    private readonly bool _hasCategoria;

    public CuartaTicketDetalleRepository(IDbConnection db)
    {
        _db = db;
        _hasEsInterno = _db.QuerySingleOrDefault<int?>(
            """
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA='tkt' AND TABLE_NAME='ComentariosTicket' AND COLUMN_NAME='EsInterno';
            """) == 1;
        _hasCategoria = _db.QuerySingleOrDefault<int?>(
            """
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA='tkt' AND TABLE_NAME='vsTickets' AND COLUMN_NAME='CategoriaTicket';
            """) == 1;
    }

    public bool SupportsComentariosInternos => _hasEsInterno;

    public async Task<(int SolicitanteId, TicketDetalleDto Detalle)?> GetDetalleAsync(
        int ticketId,
        CancellationToken ct = default)
    {
        var sql = $"""
            SELECT TicketID AS TicketId,
                   TituloTicket AS Titulo,
                   DescripcionTicket AS Descripcion,
                   EstadoTicket AS Estado,
                   PrioridadTicket AS Prioridad,
                   {(_hasCategoria ? "Categoria," : "CAST(NULL AS NVARCHAR(100)) AS Categoria,")}
                   FechaCreacionTicket AS FechaCreacion,
                   FechaCierre,
                   UsuarioSolicitanteID AS SolicitanteId
            FROM tkt.vsTickets WITH (NOLOCK)
            WHERE TicketID = @TicketId AND bEliminado = 0;
            """;

        var row = await _db.QuerySingleOrDefaultAsync<dynamic>(
            new CommandDefinition(sql, new { TicketId = ticketId }, cancellationToken: ct));

        if (row is null)
        {
            return null;
        }

        var detalle = new TicketDetalleDto
        {
            TicketId = (int)row.TicketId,
            Titulo = (string)row.Titulo,
            Descripcion = (string)row.Descripcion,
            Estado = (string)row.Estado,
            Prioridad = (string)row.Prioridad,
            Categoria = row.Categoria as string,
            FechaCreacion = (DateTime)row.FechaCreacion,
            FechaCierre = row.FechaCierre as DateTime?,
        };

        return ((int)row.SolicitanteId, detalle);
    }

    public async Task<IReadOnlyList<ComentarioTicketDto>> ListComentariosAsync(
        int ticketId,
        bool includeInternos,
        CancellationToken ct = default)
    {
        var internoFilter = _hasEsInterno && !includeInternos ? "AND c.EsInterno = 0" : string.Empty;
        var esInternoSelect = _hasEsInterno ? "c.EsInterno" : "CAST(0 AS BIT) AS EsInterno";

        // ADR-008: detectar nombre de columna según schema pre/post DB-001.
        var (nombreCol, _, _) = SqlSchemaCompat.UsuarioColumns(_db, "u");
        var sql = $"""
            SELECT c.ComentarioTicketID AS ComentarioTicketId,
                   c.Comentario,
                   c.FechaComentario,
                   {nombreCol} AS AutorNombre,
                   {esInternoSelect}
            FROM tkt.ComentariosTicket c WITH (NOLOCK)
            INNER JOIN sgr.Usuarios u WITH (NOLOCK) ON u.UsuarioID = c.UsuarioID
            WHERE c.TicketID = @TicketId
              AND c.bEliminado = 0
              {internoFilter}
            ORDER BY c.FechaComentario ASC, c.ComentarioTicketID ASC;
            """;

        var items = await _db.QueryAsync<ComentarioTicketDto>(
            new CommandDefinition(sql, new { TicketId = ticketId }, cancellationToken: ct));
        return items.ToList();
    }

    public async Task<int> InsertComentarioAsync(
        int ticketId,
        int usuarioId,
        string correo,
        string texto,
        bool esInterno,
        IDbTransaction tx)
    {
        var esInternoSql = _hasEsInterno ? ", EsInterno" : string.Empty;
        var esInternoVal = _hasEsInterno ? ", @EsInterno" : string.Empty;
        var internoParam = _hasEsInterno && esInterno;

        var sql = $"""
            INSERT INTO tkt.ComentariosTicket
                (TicketID, UsuarioID, Comentario, FechaComentario,
                 Creado, UsuarioCreacionID, FechaCreacion, bEliminado{esInternoSql})
            VALUES
                (@TicketId, @UsuarioId, @Texto, SYSUTCDATETIME(),
                 @Correo, @UsuarioId, SYSUTCDATETIME(), 0{esInternoVal});
            SELECT CAST(SCOPE_IDENTITY() AS INT);
            """;

        return await _db.ExecuteScalarAsync<int>(sql, new
        {
            TicketId = ticketId,
            UsuarioId = usuarioId,
            Texto = texto,
            Correo = correo,
            EsInterno = internoParam,
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
}
