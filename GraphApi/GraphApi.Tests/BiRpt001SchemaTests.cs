using GraphApi.Infrastructure;
using Microsoft.Data.SqlClient;

namespace GraphApi.Tests;

/// <summary>
/// TC-BIRPT-03 / TC-BIRPT-04 — schema BI (requiere DB-010 en BD).
/// </summary>
public class BiRpt001SchemaTests
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
            return true;
        }
        catch
        {
            return false;
        }
    }

    [Fact]
    public void TC_BIRPT_03_kpi_snapshots_has_extended_columns()
    {
        if (!DatabaseAvailable())
            return;

        using var conn = new SqlConnection(ConnectionString);
        conn.Open();

        Assert.True(SqlSchemaCompat.HasColumn(conn, "bi", "KpiSnapshots", "TiempoMedioResolucionHoras"));
        Assert.True(SqlSchemaCompat.HasColumn(conn, "bi", "KpiSnapshots", "CasasTotales"));
        Assert.True(SqlSchemaCompat.HasColumn(conn, "bi", "KpiSnapshots", "CasasOcupadas"));
    }

    [Fact]
    public void TC_BIRPT_04_kpi_snapshots_unique_index_condominio_fecha()
    {
        if (!DatabaseAvailable())
            return;

        using var conn = new SqlConnection(ConnectionString);
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT COUNT(*)
            FROM sys.indexes i
            INNER JOIN sys.tables t ON t.object_id = i.object_id
            INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
            WHERE s.name = N'bi' AND t.name = N'KpiSnapshots'
              AND i.name = N'UX_bi_KpiSnapshots_Condominio_Fecha' AND i.is_unique = 1;
            """;
        var count = Convert.ToInt32(cmd.ExecuteScalar());
        Assert.True(count >= 1);
    }
}
