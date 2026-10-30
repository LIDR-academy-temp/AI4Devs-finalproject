using System.Data;
using Dapper;
using GraphApi.Infrastructure;
using GraphApi.Infrastructure.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace GraphApi.Controllers.Setup;

/// <summary>
/// Endpoints de diagnóstico para SETUP-000 (no negocio). Quitar o proteger en producción si se desea.
/// </summary>
[ApiController]
[Route("Setup/[controller]")]
public class SetupDiagnosticsController(IDbConnection db) : ControllerBase
{
    [HttpGet("conflict-sample")]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public IActionResult ConflictSample() =>
        Result.Fail("CONFLICT", "Conflicto de prueba SETUP-000.").ToActionResult();

    /// <summary>Comprueba base y tablas WMS de la conexión Default (misma que usa Almacén).</summary>
    [HttpGet("db-wms")]
    [Authorize(Policy = "SoloAdministrador")]
    public IActionResult DbWms()
    {
        string? server = null;
        if (db is SqlConnection sc)
        {
            try
            {
                var csb = new SqlConnectionStringBuilder(sc.ConnectionString);
                server = csb.DataSource;
            }
            catch
            {
                // ignore
            }
        }

        return Ok(new
        {
            database = SqlSchemaCompat.CurrentDatabaseName(db),
            server,
            wmsArticulos = SqlSchemaCompat.HasTable(db, "wms", "Articulos"),
            wmsCategorias = SqlSchemaCompat.HasTable(db, "wms", "CategoriasArticulo"),
            wmsDisponible = SqlSchemaCompat.WmsDisponible(db),
            wmsPrestamos = SqlSchemaCompat.HasTable(db, "wms", "Prestamos"),
            perfilesColumn = SqlSchemaCompat.PerfilNombreColumn(db, "p"),
            usuariosPadronProbeOk = ProbeUsuariosPadron(db),
        });
    }

    private static bool ProbeUsuariosPadron(IDbConnection db)
    {
        try
        {
            SqlSchemaCompat.EnsureOpen(db);
            if (SqlSchemaCompat.HasView(db, "sgr", "vsUsuarios"))
            {
                var legacy = SqlSchemaCompat.ViewHasColumn(db, "sgr", "vsUsuarios", "NombreUsuario");
                var viewSql = legacy
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
                _ = db.ExecuteScalar(viewSql);
                return true;
            }

            var (nombre, _, activo) = SqlSchemaCompat.UsuarioColumns(db, "u");
            _ = SqlSchemaCompat.PerfilNombreColumn(db, "p");
            var sql = $"""
                SELECT TOP (1) u.UsuarioID
                FROM sgr.Usuarios u WITH (NOLOCK)
                INNER JOIN sgr.Perfiles p WITH (NOLOCK) ON p.PerfilID = u.PerfilID
                WHERE u.bEliminado = 0 AND {activo} = 1
                ORDER BY {nombre};
                """;
            _ = db.ExecuteScalar(sql);
            return true;
        }
        catch
        {
            return false;
        }
    }
}
