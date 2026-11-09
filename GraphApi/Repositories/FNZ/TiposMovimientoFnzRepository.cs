using System.Data;
using Dapper;

namespace GraphApi.Repositories.FNZ;

public sealed class TiposMovimientoFnzRepository : ITiposMovimientoFnzRepository
{
    private readonly IDbConnection _db;

    public TiposMovimientoFnzRepository(IDbConnection db) => _db = db;

    public async Task<bool> TablaDisponibleAsync(CancellationToken ct = default)
    {
        const string sql = "SELECT CASE WHEN OBJECT_ID(N'fnz.TiposMovimiento', N'U') IS NOT NULL THEN 1 ELSE 0 END;";
        return await _db.ExecuteScalarAsync<int>(new CommandDefinition(sql, cancellationToken: ct)) is 1;
    }

    public async Task<IReadOnlyList<TipoMovimientoFnzRow>> ListarAsync(CancellationToken ct = default)
    {
        if (!await TablaDisponibleAsync(ct)) return Array.Empty<TipoMovimientoFnzRow>();

        const string sql = """
            SELECT TipoMovimientoID AS TipoMovimientoId,
                   TipoMovimiento,
                   bCargo AS BCargo,
                   bAbono AS BAbono
            FROM fnz.TiposMovimiento WITH (NOLOCK)
            WHERE bEliminado = 0
            ORDER BY TipoMovimiento;
            """;
        var rows = await _db.QueryAsync<TipoMovimientoFnzRow>(new CommandDefinition(sql, cancellationToken: ct));
        return rows.ToList();
    }

    public async Task<TipoMovimientoFnzRow?> ObtenerAsync(int tipoMovimientoId, CancellationToken ct = default)
    {
        if (!await TablaDisponibleAsync(ct)) return null;

        const string sql = """
            SELECT TipoMovimientoID AS TipoMovimientoId,
                   TipoMovimiento,
                   bCargo AS BCargo,
                   bAbono AS BAbono
            FROM fnz.TiposMovimiento WITH (NOLOCK)
            WHERE TipoMovimientoID = @Id AND bEliminado = 0;
            """;
        return await _db.QuerySingleOrDefaultAsync<TipoMovimientoFnzRow>(
            new CommandDefinition(sql, new { Id = tipoMovimientoId }, cancellationToken: ct));
    }

    public async Task<TipoMovimientoFnzRow?> ObtenerPorNombreAsync(string nombre, CancellationToken ct = default)
    {
        if (!await TablaDisponibleAsync(ct)) return null;

        const string sql = """
            SELECT TipoMovimientoID AS TipoMovimientoId, TipoMovimiento, bCargo AS BCargo, bAbono AS BAbono
            FROM fnz.TiposMovimiento WITH (NOLOCK)
            WHERE TipoMovimiento = @Nombre AND bEliminado = 0;
            """;
        return await _db.QuerySingleOrDefaultAsync<TipoMovimientoFnzRow>(
            new CommandDefinition(sql, new { Nombre = nombre }, cancellationToken: ct));
    }

    public async Task<bool> ExisteNombreAsync(string nombre, int? excluirId, CancellationToken ct = default)
    {
        if (!await TablaDisponibleAsync(ct)) return false;

        const string sql = """
            SELECT CASE WHEN EXISTS (
                SELECT 1 FROM fnz.TiposMovimiento WITH (NOLOCK)
                WHERE TipoMovimiento = @Nombre AND bEliminado = 0
                  AND (@ExcluirId IS NULL OR TipoMovimientoID <> @ExcluirId)
            ) THEN 1 ELSE 0 END;
            """;
        return await _db.ExecuteScalarAsync<int>(
            new CommandDefinition(sql, new { Nombre = nombre, ExcluirId = excluirId }, cancellationToken: ct)) is 1;
    }

    public async Task<int> ContarTransaccionesAsync(int tipoMovimientoId, CancellationToken ct = default)
    {
        if (!await TablaDisponibleAsync(ct)) return 0;

        const string sql = """
            SELECT COUNT(1) FROM fnz.Transacciones WITH (NOLOCK)
            WHERE TipoMovimientoID = @Id AND bEliminado = 0;
            """;
        return await _db.ExecuteScalarAsync<int>(
            new CommandDefinition(sql, new { Id = tipoMovimientoId }, cancellationToken: ct));
    }

    public async Task<int> InsertarAsync(
        string nombre, bool bCargo, bool bAbono, string correo, int userId, CancellationToken ct = default)
    {
        const string sql = """
            INSERT INTO fnz.TiposMovimiento
                (TipoMovimiento, bCargo, bAbono, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            VALUES
                (@Nombre, @BCargo, @BAbono, @Correo, @UserId, GETDATE(), 0);
            SELECT CAST(SCOPE_IDENTITY() AS int);
            """;
        return await _db.ExecuteScalarAsync<int>(
            new CommandDefinition(
                sql,
                new { Nombre = nombre, BCargo = bCargo, BAbono = bAbono, Correo = correo, UserId = userId },
                cancellationToken: ct));
    }

    public async Task<bool> ActualizarAsync(
        int tipoMovimientoId, string nombre, bool bCargo, bool bAbono, string correo, int userId,
        CancellationToken ct = default)
    {
        const string sql = """
            UPDATE fnz.TiposMovimiento SET
                TipoMovimiento = @Nombre,
                bCargo = @BCargo,
                bAbono = @BAbono,
                Modificado = @Correo,
                UsuarioModificacionID = @UserId,
                FechaModificacion = GETDATE()
            WHERE TipoMovimientoID = @Id AND bEliminado = 0;
            """;
        var n = await _db.ExecuteAsync(
            new CommandDefinition(
                sql,
                new { Id = tipoMovimientoId, Nombre = nombre, BCargo = bCargo, BAbono = bAbono, Correo = correo, UserId = userId },
                cancellationToken: ct));
        return n > 0;
    }

    public async Task<bool> SoftDeleteAsync(int tipoMovimientoId, string correo, int userId, CancellationToken ct = default)
    {
        const string sql = """
            UPDATE fnz.TiposMovimiento SET
                bEliminado = 1,
                Modificado = @Correo,
                UsuarioModificacionID = @UserId,
                FechaModificacion = GETDATE()
            WHERE TipoMovimientoID = @Id AND bEliminado = 0;
            """;
        var n = await _db.ExecuteAsync(
            new CommandDefinition(sql, new { Id = tipoMovimientoId, Correo = correo, UserId = userId }, cancellationToken: ct));
        return n > 0;
    }
}
