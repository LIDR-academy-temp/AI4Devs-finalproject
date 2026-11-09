using System.Data;
using System.Text;
using Dapper;
using GraphApi.Infrastructure;
using GraphApi.Models.SGR.Usuarios;

namespace GraphApi.Repositories.SGR;

public sealed class UsuarioPerfilRepository : IUsuarioPerfilRepository
{
    private readonly IDbConnection _db;

    // Column names are detected once (before any transaction is active) and cached
    // to avoid SqlException when HasColumn runs on a connection with an open transaction.
    private string? _cachedCorreoName;
    private string? _cachedNombreName;
    private string? _cachedTelefonoName;

    public UsuarioPerfilRepository(IDbConnection db) => _db = db;

    /// <summary>
    /// Resolves and caches column names using schema detection.
    /// Must be called while no transaction is active on <see cref="_db"/>.
    /// </summary>
    private void EnsureColumnNames()
    {
        if (_cachedCorreoName is not null) return;
        var (nombreCol, correoCol, _) = SqlSchemaCompat.UsuarioColumns(_db);
        _cachedCorreoName = ColumnNameOnly(correoCol);
        _cachedNombreName = ColumnNameOnly(nombreCol);
        _cachedTelefonoName = ColumnNameOnly(SqlSchemaCompat.UsuarioTelefonoColumn(_db));
    }

    public async Task<PerfilDto?> ObtenerAsync(int usuarioId, CancellationToken ct = default)
    {
        var (nombreCol, correoCol, _) = SqlSchemaCompat.UsuarioColumns(_db);
        // Populate cache while we are outside any transaction
        EnsureColumnNames();
        var telefonoCol = SqlSchemaCompat.UsuarioTelefonoColumn(_db);
        var perfilCol = SqlSchemaCompat.PerfilNombreColumn(_db);
        var condoNombre = SqlSchemaCompat.CondominioNombreColumn(_db);
        var dirCasa = SqlSchemaCompat.CasaDireccionColumn(_db);
        var numCasa = SqlSchemaCompat.CasaNumeroSelect(_db);
        var casaJoin = SqlSchemaCompat.CasaPorUsuarioJoin(_db, "u.UsuarioID");

        var sql = new StringBuilder($"""
            SELECT
                u.UsuarioID AS UsuarioId,
                {nombreCol} AS Nombre,
                {correoCol} AS Correo,
                {telefonoCol} AS Telefono,
                {perfilCol} AS Perfil,
                CASE
                    WHEN ca.CasaID IS NOT NULL THEN
                        LTRIM(RTRIM(ISNULL({dirCasa}, '') + N' ' + ISNULL({numCasa}, N'')))
                    ELSE NULL
                END AS Unidad,
                {condoNombre} AS Condominio
            FROM sgr.Usuarios u WITH (NOLOCK)
            INNER JOIN sgr.Perfiles p WITH (NOLOCK) ON p.PerfilID = u.PerfilID AND p.bEliminado = 0
            {casaJoin}
            LEFT JOIN sgr.Condominios cond WITH (NOLOCK)
                ON cond.CondominioID = ca.CondominioID AND cond.bEliminado = 0
            WHERE u.UsuarioID = @UsuarioId AND u.bEliminado = 0;
            """);

        return await _db.QuerySingleOrDefaultAsync<PerfilDto>(
            new CommandDefinition(sql.ToString(), new { UsuarioId = usuarioId }, cancellationToken: ct));
    }

    public async Task<bool> ExisteCorreoOtroUsuarioAsync(int usuarioId, string correo, CancellationToken ct = default)
    {
        var (_, correoCol, _) = SqlSchemaCompat.UsuarioColumns(_db);
        var sql = $"""
            SELECT CASE WHEN EXISTS (
                SELECT 1 FROM sgr.Usuarios u WITH (NOLOCK)
                WHERE {correoCol} = @Correo AND u.UsuarioID <> @UsuarioId AND u.bEliminado = 0
            ) THEN 1 ELSE 0 END;
            """;

        var v = await _db.ExecuteScalarAsync<int>(
            new CommandDefinition(sql, new { UsuarioId = usuarioId, Correo = correo }, cancellationToken: ct));
        return v is 1;
    }

    public async Task<bool> ActualizarAsync(
        int usuarioId,
        string correo,
        string? telefono,
        string? nombre,
        string modificadoCorreo,
        int modificadoPorId,
        IDbTransaction tx)
    {
        // Use pre-cached column names — never call HasColumn while a transaction is active
        // on _db, because HasColumn runs schema queries without the transaction and SQL Server
        // throws, causing HasColumn to silently return false and produce wrong column names.
        EnsureColumnNames();
        var correoName = _cachedCorreoName!;
        var nombreName = _cachedNombreName!;
        var telefonoName = _cachedTelefonoName!;

        var sql = $"""
            UPDATE sgr.Usuarios
               SET {correoName} = @Correo,
                   {telefonoName} = @Telefono,
                   {nombreName} = COALESCE(@Nombre, {nombreName}),
                   Modificado = @Modificado,
                   UsuarioModificacionID = @ModificadoPorId,
                   FechaModificacion = SYSUTCDATETIME()
             WHERE UsuarioID = @UsuarioId AND bEliminado = 0;
            """;

        var rows = await _db.ExecuteAsync(sql, new
        {
            UsuarioId = usuarioId,
            Correo = correo,
            Telefono = telefono,
            Nombre = nombre,
            Modificado = modificadoCorreo,
            ModificadoPorId = modificadoPorId,
        }, tx);

        return rows == 1;
    }

    private static string ColumnNameOnly(string qualifiedColumn)
        => qualifiedColumn[(qualifiedColumn.IndexOf('.') + 1)..];
}
