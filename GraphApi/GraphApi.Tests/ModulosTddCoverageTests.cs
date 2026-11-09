namespace GraphApi.Tests;

/// <summary>
/// Gate Entrega 3: cada dominio in-scope debe tener al menos un archivo *Tests.cs dedicado.
/// Excluido: bot-ia (v2).
/// </summary>
public class ModulosTddCoverageTests
{
    private static readonly (string Modulo, string[] FileNameContains)[] Map =
    [
        ("SGR", ["CuartaNavegacion", "CuartaUsuarioAdmin", "CuartaAuth", "CasaActualizar", "SqlSchemaCompat", "CuartaCasas"]),
        ("TKT", ["CuartaTicket", "CrearTicket", "TicketStatus"]),
        ("FNZ", ["FinanzasService", "CuotaEstado", "GenerarCuotas", "RegistrarPago", "MorososQuery"]),
        ("ANM", ["CuartaAnuncios", "AnunciosAuthorization"]),
        ("ENC", ["CuartaEncuestas"]),
        ("JNT", ["CuartaJuntas"]),
        ("VTS", ["CuartaVisitas", "Reservacion", "AreaComun"]),
        ("USR", ["CuartaAutomoviles", "CuartaMascotas"]),
        ("ARC", ["CuartaArchivos"]),
        ("WMS", ["CuartaAlmacen"]),
        ("NTF", ["Notificacion", "AvisoGeneral"]),
        ("Dashboard", ["DashboardKpi"]),
        ("BI/RPT", ["BiKpi", "BiRpt"]),
    ];

    private static string TestProjectDir =>
        Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", ".."));

    public static IEnumerable<object[]> Modulos() =>
        Map.Select(m => new object[] { m.Modulo, m.FileNameContains });

    [Theory]
    [MemberData(nameof(Modulos))]
    public void Modulo_tiene_archivo_de_test(string modulo, string[] tokens)
    {
        var files = Directory.GetFiles(TestProjectDir, "*Tests.cs", SearchOption.TopDirectoryOnly)
            .Select(Path.GetFileName)
            .Where(f => f is not null)
            .Select(f => f!)
            .ToList();

        var hit = files.Any(f => tokens.Any(t => f.Contains(t, StringComparison.OrdinalIgnoreCase)));
        Assert.True(hit, $"Módulo {modulo}: falta test API. Tokens: [{string.Join(", ", tokens)}]");
    }
}
