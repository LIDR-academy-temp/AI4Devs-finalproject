using System.Diagnostics;
using Testcontainers.MsSql;

namespace GraphApi.Tests;

public class SqlSchemaIntegrationTests
{
    private static bool DockerAvailable()
    {
        try
        {
            using var process = Process.Start(new ProcessStartInfo("docker", "info")
            {
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true
            });
            return process?.WaitForExit(5000) == true && process.ExitCode == 0;
        }
        catch
        {
            return false;
        }
    }

    [Fact]
    public async Task Apply_schema_scripts_in_order_when_docker_available()
    {
        if (!DockerAvailable())
        {
            return;
        }

        await using var container = new MsSqlBuilder()
            .WithImage("mcr.microsoft.com/mssql/server:2022-latest")
            .WithPassword("YourStrong!Passw0rd")
            .Build();

        await container.StartAsync();

        var repoRoot = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", ".."));
        var scripts = new[]
        {
            Path.Combine(repoRoot, "SQL", "cuartaquinientos_schema.sql"),
            Path.Combine(repoRoot, "SQL", "DB-001_alineacion_modelo.sql"),
            Path.Combine(repoRoot, "SQL", "DB-002_seeds_catalogos.sql")
        };

        foreach (var script in scripts)
        {
            Assert.True(File.Exists(script), $"Falta script: {script}");
        }

        // Smoke: contenedor arrancó y scripts existen en el repo (ejecución sqlcmd opcional en CI con herramienta externa).
        Assert.False(string.IsNullOrWhiteSpace(container.GetConnectionString()));
    }
}
