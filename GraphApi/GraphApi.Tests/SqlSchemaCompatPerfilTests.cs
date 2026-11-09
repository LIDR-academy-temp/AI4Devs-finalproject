using System.Data;
using GraphApi.Infrastructure;
using Microsoft.Data.SqlClient;

namespace GraphApi.Tests;

public class SqlSchemaCompatPerfilTests
{
    private const string DefaultConnection =
        "Server=localhost;Database=CuartaQuinientos;Trusted_Connection=True;TrustServerCertificate=True;";

    private static string ConnectionString =>
        Environment.GetEnvironmentVariable("ConnectionStrings__Default") ?? DefaultConnection;

    private static bool DatabaseAvailable()
    {
        try
        {
            using var conn = new SqlConnection(ConnectionString);
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT DB_ID(N'CuartaQuinientos')";
            return cmd.ExecuteScalar() is not null and not DBNull;
        }
        catch
        {
            return false;
        }
    }

    [Fact]
    public void PerfilNombreColumn_on_cuartaquinientos_uses_Nombre_not_Perfil()
    {
        if (!DatabaseAvailable())
            return;

        using IDbConnection db = new SqlConnection(ConnectionString);
        var expr = SqlSchemaCompat.PerfilNombreColumn(db, "p");

        Assert.Equal("p.Nombre", expr);
        Assert.False(SqlSchemaCompat.HasColumn(db, "sgr", "Perfiles", "Perfil"));
        Assert.True(SqlSchemaCompat.HasColumn(db, "sgr", "Perfiles", "Nombre"));
    }

    [Fact]
    public async Task ListarPadron_via_vsUsuarios_compiles_on_live_schema()
    {
        if (!DatabaseAvailable())
            return;

        await using var conn = new SqlConnection(ConnectionString);
        await conn.OpenAsync();
        if (!SqlSchemaCompat.HasView(conn, "sgr", "vsUsuarios"))
            return;

        var legacy = SqlSchemaCompat.ViewHasColumn(conn, "sgr", "vsUsuarios", "NombreUsuario");
        var sql = legacy
            ? """
                SELECT TOP (1) u.UsuarioID
                FROM sgr.vsUsuarios u WITH (NOLOCK)
                WHERE u.bEliminado = 0 AND u.bActivoUsuario = 1;
                """
            : """
                SELECT TOP (1) u.UsuarioID
                FROM sgr.vsUsuarios u WITH (NOLOCK)
                WHERE u.bEliminado = 0 AND u.bActivo = 1;
                """;

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        var id = await cmd.ExecuteScalarAsync();
        Assert.NotNull(id);
    }
}
