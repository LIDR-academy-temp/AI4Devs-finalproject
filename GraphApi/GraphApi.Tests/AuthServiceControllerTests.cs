using System.Net;
using System.Net.Http.Json;
using GraphApi.Models.SGR.Auth;
using GraphApi.Services.SGR.Auth;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Moq;

namespace GraphApi.Tests;

public class AuthServiceControllerTests : IDisposable
{
    private readonly WebApplicationFactory<Program> _factory;

    public AuthServiceControllerTests()
    {
        _factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["JwtSettings:Key"] = "01234567890123456789012345678901",
                    ["JwtSettings:Issuer"] = "test",
                    ["JwtSettings:Audience"] = "test",
                    ["ConnectionStrings:Default"] =
                        "Server=localhost;Database=test;User Id=sa;Password=test;TrustServerCertificate=True;Encrypt=False",
                });
            });

            builder.ConfigureServices(services =>
            {
                services.RemoveAll<ICuartaAuthService>();

                var mock = new Mock<ICuartaAuthService>();
                mock
                    .Setup(a => a.LoginAsync(It.IsAny<LoginRequest>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync((
                        new LoginResponse
                        {
                            Token = "jwt-test",
                            Expira = DateTime.UtcNow.AddHours(1),
                            Perfil = "Administrador",
                            Nombre = "Admin",
                            RequiereCambioPassword = false,
                        },
                        "refresh-plain",
                        null,
                        StatusCodes.Status200OK));

                services.AddSingleton(mock.Object);
            });
        });
    }

    [Fact]
    public async Task GenerateToken_returns_200_and_sets_refresh_cookie()
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            HandleCookies = true,
        });

        var response = await client.PostAsJsonAsync(
            "/SGR/AuthService/GenerateToken",
            new { correo = "a@b.com", password = "secret" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<LoginResponse>();
        Assert.NotNull(body);
        Assert.Equal("jwt-test", body.Token);
        Assert.True(response.Headers.TryGetValues("Set-Cookie", out var cookies));
        Assert.Contains(cookies, c => c.StartsWith("rt=", StringComparison.Ordinal));
    }

    [Fact]
    public async Task GenerateToken_invalid_body_returns_400()
    {
        var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync(
            "/SGR/AuthService/GenerateToken",
            new { correo = "", password = "" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    public void Dispose() => _factory.Dispose();
}
