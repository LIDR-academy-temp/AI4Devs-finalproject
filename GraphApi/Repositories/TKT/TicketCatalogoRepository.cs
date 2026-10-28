using System.Data;
using Dapper;
using GraphApi.Infrastructure;
using GraphApi.Models.TKT;

namespace GraphApi.Repositories.TKT;

public sealed class TicketCatalogoRepository : ITicketCatalogoRepository
{
    private readonly IDbConnection _db;
    private readonly string _prioridadTable;
    private readonly string _categoriaNameCol;

    public TicketCatalogoRepository(IDbConnection db)
    {
        _db = db;
        _prioridadTable = SqlSchemaCompat.HasTable(db, "tkt", "PrioridadesTicket")
            ? "tkt.PrioridadesTicket"
            : "tkt.PrioridadEstickets";
        _categoriaNameCol = SqlSchemaCompat.HasColumn(db, "tkt", "CategoriasTicket", "Categoria")
            ? "Categoria"
            : "CategoriaTicket";
    }

    public async Task<int> ResolveEstadoIdAsync(string estado, IDbTransaction tx)
    {
        var id = await _db.QuerySingleOrDefaultAsync<int?>(
            """
            SELECT EstadoTicketID FROM tkt.EstadosTickets
            WHERE EstadoTicket = @Nombre AND bEliminado = 0;
            """,
            new { Nombre = estado },
            tx);

        return id ?? throw new InvalidOperationException($"Estado de ticket desconocido: {estado}");
    }

    public async Task<int> ResolvePrioridadIdAsync(string prioridad, IDbTransaction tx)
    {
        var sql = $"""
            SELECT PrioridadTicketID FROM {_prioridadTable}
            WHERE PrioridadTicket = @Nombre AND bEliminado = 0;
            """;
        var id = await _db.QuerySingleOrDefaultAsync<int?>(
            sql,
            new { Nombre = prioridad },
            tx);

        return id ?? throw new InvalidOperationException($"Prioridad desconocida: {prioridad}");
    }

    public Task<int?> ResolveCategoriaIdAsync(string categoria, IDbTransaction tx)
    {
        var sql = $"""
            SELECT CategoriaTicketID FROM tkt.CategoriasTicket
            WHERE {_categoriaNameCol} = @Nombre AND bEliminado = 0;
            """;
        return _db.QuerySingleOrDefaultAsync<int?>(sql, new { Nombre = categoria }, tx);
    }

    public async Task<int> ResolveCanalIdAsync(string canal, IDbTransaction tx)
    {
        var id = await _db.QuerySingleOrDefaultAsync<int?>(
            """
            SELECT CanalID FROM tkt.CanalesTicket
            WHERE Canal = @Nombre AND bEliminado = 0;
            """,
            new { Nombre = canal },
            tx);

        return id ?? throw new InvalidOperationException($"Canal desconocido: {canal}");
    }

    public async Task<IReadOnlyList<CatalogoItemDto>> ListarCategoriasAsync(CancellationToken ct = default)
    {
        var sql = $"""
            SELECT CategoriaTicketID AS Id, {_categoriaNameCol} AS Nombre
            FROM tkt.CategoriasTicket WITH (NOLOCK)
            WHERE bEliminado = 0
            ORDER BY {_categoriaNameCol};
            """;

        var rows = await _db.QueryAsync<CatalogoItemDto>(
            new CommandDefinition(sql, cancellationToken: ct));
        return rows.ToList();
    }

    public async Task<IReadOnlyList<CatalogoItemDto>> ListarEstadosAsync(CancellationToken ct = default)
    {
        const string sql = """
            SELECT EstadoTicketID AS Id, EstadoTicket AS Nombre
            FROM tkt.EstadosTickets WITH (NOLOCK)
            WHERE bEliminado = 0
            ORDER BY EstadoTicket;
            """;

        var rows = await _db.QueryAsync<CatalogoItemDto>(
            new CommandDefinition(sql, cancellationToken: ct));
        return rows.ToList();
    }
}
