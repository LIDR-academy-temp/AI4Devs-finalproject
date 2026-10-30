using System.Data;
using Dapper;

namespace GraphApi.Repositories.FNZ;

public sealed class TiposCuentaFnzRepository : ITiposCuentaFnzRepository
{
    private readonly IDbConnection _db;

    public TiposCuentaFnzRepository(IDbConnection db) => _db = db;

    public async Task<bool> TablaDisponibleAsync(CancellationToken ct = default)
    {
        const string sql = "SELECT CASE WHEN OBJECT_ID(N'fnz.TiposCuenta', N'U') IS NOT NULL THEN 1 ELSE 0 END;";
        return await _db.ExecuteScalarAsync<int>(new CommandDefinition(sql, cancellationToken: ct)) is 1;
    }

    public async Task<IReadOnlyList<TipoCuentaFnzRow>> ListarAsync(CancellationToken ct = default)
    {
        if (!await TablaDisponibleAsync(ct)) return Array.Empty<TipoCuentaFnzRow>();

        const string sql = """
            SELECT TipoCuentaID AS TipoCuentaId, Nombre, Descripcion
            FROM fnz.TiposCuenta WITH (NOLOCK)
            WHERE bEliminado = 0
            ORDER BY Nombre;
            """;
        var rows = await _db.QueryAsync<TipoCuentaFnzRow>(new CommandDefinition(sql, cancellationToken: ct));
        return rows.ToList();
    }

    public async Task<TipoCuentaFnzRow?> ObtenerAsync(int tipoCuentaId, CancellationToken ct = default)
    {
        if (!await TablaDisponibleAsync(ct)) return null;

        const string sql = """
            SELECT TipoCuentaID AS TipoCuentaId, Nombre, Descripcion
            FROM fnz.TiposCuenta WITH (NOLOCK)
            WHERE TipoCuentaID = @Id AND bEliminado = 0;
            """;
        return await _db.QuerySingleOrDefaultAsync<TipoCuentaFnzRow>(
            new CommandDefinition(sql, new { Id = tipoCuentaId }, cancellationToken: ct));
    }

    public async Task<bool> ExisteNombreAsync(string nombre, int? excluirId, CancellationToken ct = default)
    {
        if (!await TablaDisponibleAsync(ct)) return false;

        const string sql = """
            SELECT CASE WHEN EXISTS (
                SELECT 1 FROM fnz.TiposCuenta WITH (NOLOCK)
                WHERE Nombre = @Nombre AND bEliminado = 0
                  AND (@ExcluirId IS NULL OR TipoCuentaID <> @ExcluirId)
            ) THEN 1 ELSE 0 END;
            """;
        return await _db.ExecuteScalarAsync<int>(
            new CommandDefinition(sql, new { Nombre = nombre, ExcluirId = excluirId }, cancellationToken: ct)) is 1;
    }

    public async Task<int> InsertarAsync(
        string nombre, string? descripcion, string correo, int userId, CancellationToken ct = default)
    {
        const string sql = """
            INSERT INTO fnz.TiposCuenta
                (Nombre, Descripcion, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            VALUES
                (@Nombre, @Descripcion, @Correo, @UserId, GETDATE(), 0);
            SELECT CAST(SCOPE_IDENTITY() AS int);
            """;
        return await _db.ExecuteScalarAsync<int>(
            new CommandDefinition(
                sql,
                new { Nombre = nombre, Descripcion = descripcion, Correo = correo, UserId = userId },
                cancellationToken: ct));
    }

    public async Task<bool> ActualizarAsync(
        int tipoCuentaId, string nombre, string? descripcion, string correo, int userId, CancellationToken ct = default)
    {
        const string sql = """
            UPDATE fnz.TiposCuenta SET
                Nombre = @Nombre,
                Descripcion = @Descripcion,
                Modificado = @Correo,
                UsuarioModificacionID = @UserId,
                FechaModificacion = GETDATE()
            WHERE TipoCuentaID = @Id AND bEliminado = 0;
            """;
        var n = await _db.ExecuteAsync(
            new CommandDefinition(
                sql,
                new { Id = tipoCuentaId, Nombre = nombre, Descripcion = descripcion, Correo = correo, UserId = userId },
                cancellationToken: ct));
        return n > 0;
    }

    public async Task<bool> SoftDeleteAsync(int tipoCuentaId, string correo, int userId, CancellationToken ct = default)
    {
        const string sql = """
            UPDATE fnz.TiposCuenta SET
                bEliminado = 1,
                Modificado = @Correo,
                UsuarioModificacionID = @UserId,
                FechaModificacion = GETDATE()
            WHERE TipoCuentaID = @Id AND bEliminado = 0;
            """;
        var n = await _db.ExecuteAsync(
            new CommandDefinition(sql, new { Id = tipoCuentaId, Correo = correo, UserId = userId }, cancellationToken: ct));
        return n > 0;
    }
}
