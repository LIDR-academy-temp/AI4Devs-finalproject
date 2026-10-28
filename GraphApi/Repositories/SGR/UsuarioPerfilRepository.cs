using System.Data;
using Dapper;
using GraphApi.Models.SGR.Usuarios;

namespace GraphApi.Repositories.SGR;

public sealed class UsuarioPerfilRepository : IUsuarioPerfilRepository
{
    private readonly IDbConnection _db;

    public UsuarioPerfilRepository(IDbConnection db) => _db = db;

    public async Task<PerfilDto?> ObtenerAsync(int usuarioId, CancellationToken ct = default)
    {
        const string sql = """
            SELECT
                u.UsuarioID AS UsuarioId,
                u.NombreUsuario AS Nombre,
                u.CorreoUsuario AS Correo,
                u.TelefonoUsuario AS Telefono,
                u.Perfil AS Perfil,
                CASE
                    WHEN c.DireccionCasa IS NOT NULL THEN
                        LTRIM(RTRIM(ISNULL(c.DireccionCasa, '') + ' ' + ISNULL(c.NumeroExtCasa, '')))
                    ELSE NULL
                END AS Unidad,
                c.NombreCondominio AS Condominio
            FROM sgr.vsUsuarios u WITH (NOLOCK)
            OUTER APPLY (
                SELECT TOP (1) vc.DireccionCasa, vc.NumeroExtCasa, vc.NombreCondominio
                FROM sgr.vsCasas vc WITH (NOLOCK)
                WHERE vc.PropietarioUsuarioID = u.UsuarioID AND vc.bEliminado = 0
            ) c
            WHERE u.UsuarioID = @UsuarioId AND u.bEliminado = 0;
            """;

        return await _db.QuerySingleOrDefaultAsync<PerfilDto>(
            new CommandDefinition(sql, new { UsuarioId = usuarioId }, cancellationToken: ct));
    }

    public async Task<bool> ExisteCorreoOtroUsuarioAsync(int usuarioId, string correo, CancellationToken ct = default)
    {
        const string sql = """
            SELECT CASE WHEN EXISTS (
                SELECT 1 FROM sgr.Usuarios WITH (NOLOCK)
                WHERE CorreoUsuario = @Correo AND UsuarioID <> @UsuarioId AND bEliminado = 0
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
        const string sql = """
            UPDATE sgr.Usuarios
               SET CorreoUsuario = @Correo,
                   TelefonoUsuario = @Telefono,
                   NombreUsuario = COALESCE(@Nombre, NombreUsuario),
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
}
