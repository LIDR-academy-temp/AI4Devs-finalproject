using Dapper;
using GraphApi.Models.TKT;

namespace GraphApi.Repositories.TKT;

public sealed class CuartaTicketQueryRepository : ICuartaTicketQueryRepository
{
    private readonly System.Data.IDbConnection _db;
    private readonly bool _hasCategoria;

    public CuartaTicketQueryRepository(System.Data.IDbConnection db)
    {
        _db = db;
        _hasCategoria = _db.QuerySingleOrDefault<int?>(
            """
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'tkt' AND TABLE_NAME = 'vsTickets' AND COLUMN_NAME = 'CategoriaTicket';
            """) == 1;
    }

    public async Task<PaginaDto<MiTicketItemDto>> GetMisTicketsAsync(
        int usuarioId,
        TicketFiltroDto filtro,
        CancellationToken ct = default)
    {
        var offset = (filtro.Pagina - 1) * filtro.Tamano;
        var categoriaFilter = _hasCategoria
            ? "AND (@CategoriaTicketId IS NULL OR CategoriaTicketID = @CategoriaTicketId)"
            : string.Empty;

        var sql = $"""
            SELECT COUNT(*)
            FROM tkt.vsTickets WITH (NOLOCK)
            WHERE UsuarioSolicitanteID = @UsuarioId
              AND bEliminado = 0
              AND (@EstadoTicketId IS NULL OR EstadoTicketID = @EstadoTicketId)
              {categoriaFilter};

            SELECT TicketID AS TicketId,
                   Titulo,
                   EstadoTicket AS Estado,
                   PrioridadTicket AS Prioridad,
                   {(_hasCategoria ? "CategoriaTicket AS Categoria," : "CAST(NULL AS NVARCHAR(100)) AS Categoria,")}
                   FechaCreacionTicket AS FechaCreacion
            FROM tkt.vsTickets WITH (NOLOCK)
            WHERE UsuarioSolicitanteID = @UsuarioId
              AND bEliminado = 0
              AND (@EstadoTicketId IS NULL OR EstadoTicketID = @EstadoTicketId)
              {categoriaFilter}
            ORDER BY FechaCreacionTicket DESC, TicketID DESC
            OFFSET @Offset ROWS FETCH NEXT @Tamano ROWS ONLY;
            """;

        using var multi = await _db.QueryMultipleAsync(
            new CommandDefinition(
                sql,
                new
                {
                    UsuarioId = usuarioId,
                    filtro.EstadoTicketId,
                    filtro.CategoriaTicketId,
                    Offset = offset,
                    Tamano = filtro.Tamano,
                },
                cancellationToken: ct));

        var total = await multi.ReadSingleAsync<int>();
        var items = (await multi.ReadAsync<MiTicketItemDto>()).ToList();

        return new PaginaDto<MiTicketItemDto>
        {
            Total = total,
            Pagina = filtro.Pagina,
            Items = items,
        };
    }
}
