using Dapper;
using GraphApi.Infrastructure;
using GraphApi.Models.TKT;

namespace GraphApi.Repositories.TKT;

public sealed class CuartaTicketQueryRepository : ICuartaTicketQueryRepository
{
    private readonly System.Data.IDbConnection _db;
    private readonly bool _hasCategoria;
    private readonly string _prioridadTable;
    private readonly bool _prioridadHasOrden;
    private readonly string _tituloColumn;

    public CuartaTicketQueryRepository(System.Data.IDbConnection db)
    {
        _db = db;
        _hasCategoria = _db.QuerySingleOrDefault<int?>(
            """
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'tkt' AND TABLE_NAME = 'vsTickets' AND COLUMN_NAME = 'CategoriaTicket';
            """) == 1;
        _prioridadTable = SqlSchemaCompat.HasTable(db, "tkt", "PrioridadesTicket")
            ? "tkt.PrioridadesTicket"
            : "tkt.PrioridadEstickets";
        _prioridadHasOrden = SqlSchemaCompat.HasColumn(db, "tkt", "PrioridadesTicket", "Orden")
            || SqlSchemaCompat.HasColumn(db, "tkt", "PrioridadEstickets", "Orden");
        _tituloColumn = SqlSchemaCompat.HasColumn(db, "tkt", "vsTickets", "Titulo")
            ? "Titulo"
            : "TituloTicket";
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
                   {_tituloColumn} AS Titulo,
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

    public async Task<PaginaDto<MiTicketItemDto>> GetTicketsAsignadosAsync(
        int usuarioId,
        TicketAsignadosFiltroDto filtro,
        CancellationToken ct = default)
    {
        var offset = (filtro.Pagina - 1) * filtro.Tamano;
        var categoriaSelect = _hasCategoria
            ? "V.CategoriaTicket AS Categoria,"
            : "CAST(NULL AS NVARCHAR(100)) AS Categoria,";
        var orderBy = _prioridadHasOrden
            ? "P.Orden DESC, V.FechaCreacionTicket ASC, V.TicketID ASC"
            : "V.FechaCreacionTicket ASC, V.TicketID ASC";

        var sql = $"""
            SELECT COUNT(*)
            FROM tkt.TicketsUsuariosAsignados TUA WITH (NOLOCK)
            INNER JOIN tkt.vsTickets V WITH (NOLOCK) ON V.TicketID = TUA.TicketID
            INNER JOIN {_prioridadTable} P WITH (NOLOCK) ON P.PrioridadTicketID = V.PrioridadTicketID
            WHERE TUA.UsuarioID = @UsuarioId
              AND TUA.bEliminado = 0
              AND V.bEliminado = 0
              AND (@Terminado IS NULL OR TUA.Terminado = @Terminado)
              AND (@EstadoTicketId IS NULL OR V.EstadoTicketID = @EstadoTicketId);

            SELECT V.TicketID AS TicketId,
                   V.{_tituloColumn} AS Titulo,
                   V.EstadoTicket AS Estado,
                   V.PrioridadTicket AS Prioridad,
                   {categoriaSelect}
                   V.FechaCreacionTicket AS FechaCreacion
            FROM tkt.TicketsUsuariosAsignados TUA WITH (NOLOCK)
            INNER JOIN tkt.vsTickets V WITH (NOLOCK) ON V.TicketID = TUA.TicketID
            INNER JOIN {_prioridadTable} P WITH (NOLOCK) ON P.PrioridadTicketID = V.PrioridadTicketID
            WHERE TUA.UsuarioID = @UsuarioId
              AND TUA.bEliminado = 0
              AND V.bEliminado = 0
              AND (@Terminado IS NULL OR TUA.Terminado = @Terminado)
              AND (@EstadoTicketId IS NULL OR V.EstadoTicketID = @EstadoTicketId)
            ORDER BY {orderBy}
            OFFSET @Offset ROWS FETCH NEXT @Tamano ROWS ONLY;
            """;

        using var multi = await _db.QueryMultipleAsync(
            new CommandDefinition(
                sql,
                new
                {
                    UsuarioId = usuarioId,
                    filtro.Terminado,
                    filtro.EstadoTicketId,
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
