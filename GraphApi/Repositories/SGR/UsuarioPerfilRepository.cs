using System.Data;
using System.Text;
using Dapper;
using GraphApi.Infrastructure;
using GraphApi.Models.SGR.Usuarios;

namespace GraphApi.Repositories.SGR;

public sealed class UsuarioPerfilRepository : IUsuarioPerfilRepository
{
    private readonly IDbConnection _db;

    public UsuarioPerfilRepository(IDbConnection db) => _db = db;

    public async Task<PerfilDto?> ObtenerAsync(int usuarioId, CancellationToken ct = default)
    {
        var (nombreCol, correoCol, _) = SqlSchemaCompat.UsuarioColumns(_db);
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
                SELECT 1 FROM sgr.Usuarios WITH (NOLOCK)
                WHERE {correoCol} = @Correo AND UsuarioID <> @UsuarioId AND bEliminado = 0
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
        var (nombreCol, correoCol, _) = SqlSchemaCompat.UsuarioColumns(_db);
        var correoName = ColumnNameOnly(correoCol);
        var nombreName = ColumnNameOnly(nombreCol);
        var telefonoName = ColumnNameOnly(SqlSchemaCompat.UsuarioTelefonoColumn(_db));

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
