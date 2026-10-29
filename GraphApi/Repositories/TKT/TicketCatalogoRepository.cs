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
    private readonly bool _prioridadHasOrden;

    public TicketCatalogoRepository(IDbConnection db)
    {
        _db = db;
        _prioridadTable = SqlSchemaCompat.HasTable(db, "tkt", "PrioridadesTicket")
            ? "tkt.PrioridadesTicket"
            : "tkt.PrioridadEstickets";
        _categoriaNameCol = SqlSchemaCompat.HasColumn(db, "tkt", "CategoriasTicket", "Categoria")
            ? "Categoria"
            : "CategoriaTicket";
        _prioridadHasOrden = SqlSchemaCompat.HasColumn(db, "tkt", "PrioridadesTicket", "Orden")
            || SqlSchemaCompat.HasColumn(db, "tkt", "PrioridadEstickets", "Orden");
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

    public Task<int?> ResolvePrioridadIdAsync(string prioridad, IDbTransaction tx)
    {
        var sql = $"""
            SELECT PrioridadTicketID FROM {_prioridadTable}
            WHERE PrioridadTicket = @Nombre AND bEliminado = 0;
            """;
        return _db.QuerySingleOrDefaultAsync<int?>(
            sql,
            new { Nombre = prioridad },
            tx);
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

    public async Task<IReadOnlyList<PrioridadCatalogoItemDto>> ListarPrioridadesAsync(CancellationToken ct = default)
    {
        var ordenSelect = _prioridadHasOrden ? "Orden" : "CAST(NULL AS TINYINT) AS Orden";
        var orderBy = _prioridadHasOrden ? "Orden, PrioridadTicket" : "PrioridadTicket";
        var sql = $"""
            SELECT PrioridadTicketID AS Id, PrioridadTicket AS Nombre, {ordenSelect}
            FROM {_prioridadTable} WITH (NOLOCK)
            WHERE bEliminado = 0
            ORDER BY {orderBy};
            """;

        var rows = await _db.QueryAsync<PrioridadCatalogoItemDto>(
            new CommandDefinition(sql, cancellationToken: ct));
        return rows.ToList();
    }

    public async Task<int> InsertCategoriaAsync(string nombre, string correo, int adminId, IDbTransaction? tx = null)
    {
        var sql = $"""
            INSERT INTO tkt.CategoriasTicket
                ({_categoriaNameCol}, Creado, Modificado, UsuarioCreacionID, UsuarioModificacionID,
                 FechaCreacion, FechaModificacion, bEliminado)
            OUTPUT INSERTED.CategoriaTicketID
            VALUES
                (@Nombre, @Correo, @Correo, @AdminId, @AdminId,
                 SYSUTCDATETIME(), SYSUTCDATETIME(), 0);
            """;
        return await _db.ExecuteScalarAsync<int>(
            new CommandDefinition(sql, new { Nombre = nombre, Correo = correo, AdminId = adminId }, transaction: tx));
    }

    public async Task<bool> UpdateCategoriaAsync(int id, string nombre, string correo, int adminId, IDbTransaction? tx = null)
    {
        var sql = $"""
            UPDATE tkt.CategoriasTicket
               SET {_categoriaNameCol} = @Nombre,
                   Modificado = @Correo,
                   UsuarioModificacionID = @AdminId,
                   FechaModificacion = SYSUTCDATETIME()
             WHERE CategoriaTicketID = @Id AND bEliminado = 0;
            """;
        var rows = await _db.ExecuteAsync(
            new CommandDefinition(sql, new { Id = id, Nombre = nombre, Correo = correo, AdminId = adminId }, transaction: tx));
        return rows > 0;
    }

    public async Task<bool> SoftDeleteCategoriaAsync(int id, string correo, int adminId, IDbTransaction? tx = null)
    {
        const string sql = """
            UPDATE tkt.CategoriasTicket
               SET bEliminado = 1,
                   Modificado = @Correo,
                   UsuarioModificacionID = @AdminId,
                   FechaModificacion = SYSUTCDATETIME()
             WHERE CategoriaTicketID = @Id AND bEliminado = 0;
            """;
        var rows = await _db.ExecuteAsync(
            new CommandDefinition(sql, new { Id = id, Correo = correo, AdminId = adminId }, transaction: tx));
        return rows > 0;
    }

    public async Task<bool> ExistsTicketsConCategoriaAsync(int categoriaId, IDbTransaction? tx = null)
    {
        if (!SqlSchemaCompat.HasColumn(_db, "tkt", "Tickets", "CategoriaTicketID"))
        {
            return false;
        }

        var count = await _db.ExecuteScalarAsync<int>(
            """
            SELECT COUNT(1) FROM tkt.Tickets
            WHERE CategoriaTicketID = @Id AND bEliminado = 0;
            """,
            new { Id = categoriaId },
            tx);
        return count > 0;
    }

    public async Task<int> InsertPrioridadAsync(string nombre, int? orden, string correo, int adminId, IDbTransaction? tx = null)
    {
        if (_prioridadHasOrden && orden is not null)
        {
            var sqlOrd = $"""
                INSERT INTO {_prioridadTable}
                    (PrioridadTicket, Orden, Creado, Modificado, UsuarioCreacionID, UsuarioModificacionID,
                     FechaCreacion, FechaModificacion, bEliminado)
                OUTPUT INSERTED.PrioridadTicketID
                VALUES
                    (@Nombre, @Orden, @Correo, @Correo, @AdminId, @AdminId,
                     SYSUTCDATETIME(), SYSUTCDATETIME(), 0);
                """;
            return await _db.ExecuteScalarAsync<int>(
                new CommandDefinition(sqlOrd, new { Nombre = nombre, Orden = orden, Correo = correo, AdminId = adminId }, transaction: tx));
        }

        var sql = $"""
            INSERT INTO {_prioridadTable}
                (PrioridadTicket, Creado, Modificado, UsuarioCreacionID, UsuarioModificacionID,
                 FechaCreacion, FechaModificacion, bEliminado)
            OUTPUT INSERTED.PrioridadTicketID
            VALUES
                (@Nombre, @Correo, @Correo, @AdminId, @AdminId,
                 SYSUTCDATETIME(), SYSUTCDATETIME(), 0);
            """;
        return await _db.ExecuteScalarAsync<int>(
            new CommandDefinition(sql, new { Nombre = nombre, Correo = correo, AdminId = adminId }, transaction: tx));
    }

    public async Task<bool> UpdatePrioridadAsync(int id, string nombre, int? orden, string correo, int adminId, IDbTransaction? tx = null)
    {
        var ordenSet = _prioridadHasOrden && orden is not null ? ", Orden = @Orden" : string.Empty;
        var sql = $"""
            UPDATE {_prioridadTable}
               SET PrioridadTicket = @Nombre,
                   Modificado = @Correo,
                   UsuarioModificacionID = @AdminId,
                   FechaModificacion = SYSUTCDATETIME()
                   {ordenSet}
             WHERE PrioridadTicketID = @Id AND bEliminado = 0;
            """;
        var rows = await _db.ExecuteAsync(
            new CommandDefinition(sql, new { Id = id, Nombre = nombre, Orden = orden, Correo = correo, AdminId = adminId }, transaction: tx));
        return rows > 0;
    }

    public async Task<bool> SoftDeletePrioridadAsync(int id, string correo, int adminId, IDbTransaction? tx = null)
    {
        var sql = $"""
            UPDATE {_prioridadTable}
               SET bEliminado = 1,
                   Modificado = @Correo,
                   UsuarioModificacionID = @AdminId,
                   FechaModificacion = SYSUTCDATETIME()
             WHERE PrioridadTicketID = @Id AND bEliminado = 0;
            """;
        var rows = await _db.ExecuteAsync(
            new CommandDefinition(sql, new { Id = id, Correo = correo, AdminId = adminId }, transaction: tx));
        return rows > 0;
    }

    public async Task<bool> ExistsTicketsConPrioridadAsync(int prioridadId, IDbTransaction? tx = null)
    {
        var count = await _db.ExecuteScalarAsync<int>(
            """
            SELECT COUNT(1) FROM tkt.Tickets
            WHERE PrioridadTicketID = @Id AND bEliminado = 0;
            """,
            new { Id = prioridadId },
            tx);
        return count > 0;
    }
}
