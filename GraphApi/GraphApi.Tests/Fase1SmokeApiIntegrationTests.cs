using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using GraphApi.Models.SGR.Auth;
using Microsoft.Data.SqlClient;

namespace GraphApi.Tests;

/// <summary>
/// Smoke Fase 1 contra BD + API HTTP (local). Regresión MVP archivado — no TDD de ticket.
/// Requiere API levantada (p. ej. dotnet run --urls http://localhost:5180).
/// </summary>
[Trait("Category", "Smoke")]
public class Fase1SmokeApiIntegrationTests
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private const string DefaultConnection =
        "Server=localhost;Database=CuartaQuinientos;Trusted_Connection=True;TrustServerCertificate=True;";

    private static string ConnectionString =>
        Environment.GetEnvironmentVariable("ConnectionStrings__Default") ?? DefaultConnection;

    private static string ApiBaseUrl =>
        Environment.GetEnvironmentVariable("FASE1_SMOKE_BASE_URL")?.TrimEnd('/')
        ?? "http://localhost:5180";

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

    private static async Task<bool> ApiReachableAsync(HttpClient client)
    {
        try
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(3));
            var response = await client.GetAsync("/health", cts.Token);
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    [Fact]
    public async Task Smoke_login_y_modulos_nucleo_responden_200()
    {
        if (!DatabaseAvailable())
        {
            return;
        }

        using var client = new HttpClient { BaseAddress = new Uri(ApiBaseUrl) };
        Assert.True(
            await ApiReachableAsync(client),
            $"API no disponible en {ApiBaseUrl}. Levanta GraphApi (dotnet run --urls {ApiBaseUrl}) o ejecuta .\\scripts\\Invoke-Fase1Smoke.ps1");

        var correo = Environment.GetEnvironmentVariable("FASE1_SMOKE_CORREO") ?? "admin@local";
        var password = Environment.GetEnvironmentVariable("FASE1_SMOKE_PASSWORD") ?? "Admin@Cuarta1";

        var loginResponse = await client.PostAsJsonAsync(
            "/SGR/AuthService/GenerateToken",
            new LoginRequest { Correo = correo, Password = password });

        Assert.True(
            loginResponse.StatusCode == HttpStatusCode.OK,
            $"Login smoke falló ({loginResponse.StatusCode}). API en {ApiBaseUrl}. Define FASE1_SMOKE_PASSWORD si cambiaste la contraseña.");

        var login = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>(JsonOptions);
        Assert.NotNull(login);
        Assert.False(string.IsNullOrWhiteSpace(login.Token));

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", login.Token);

        var adminUsuarioId = await ResolveAdminUsuarioIdAsync(correo);

        var endpoints = new[]
        {
            "/Dashboard/Resumen",
            "/TKT/Tickets/admin",
            "/TKT/Tickets/mis",
            "/TKT/CategoriasTicket",
            "/TKT/EstadosTickets",
            $"/FNZ/Cuotas?usuarioId={adminUsuarioId}",
            "/FNZ/Cuotas/mis",
            "/NTF/Notificaciones?pagina=1&tamano=20",
        };

        foreach (var path in endpoints)
        {
            var response = await client.GetAsync(path);
            Assert.True(
                response.StatusCode == HttpStatusCode.OK,
                $"{path} → {(int)response.StatusCode} {response.StatusCode}");
        }
    }

    private static async Task<int> ResolveAdminUsuarioIdAsync(string correo)
    {
        await using var conn = new SqlConnection(ConnectionString);
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT UsuarioID FROM sgr.Usuarios WHERE Correo = @Correo AND bEliminado = 0";
        cmd.Parameters.AddWithValue("@Correo", correo);
        var id = await cmd.ExecuteScalarAsync();
        return id is int i ? i : 2;
    }
}
