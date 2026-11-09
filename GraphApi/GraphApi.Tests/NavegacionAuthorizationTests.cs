using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.IdentityModel.Tokens;

namespace GraphApi.Tests;

public class NavegacionAuthorizationTests : IDisposable
{
    private const string JwtKey = "01234567890123456789012345678901";
    private readonly WebApplicationFactory<Program> _factory;

    public NavegacionAuthorizationTests()
    {
        _factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseSetting("JwtSettings:Key", JwtKey);
            builder.UseSetting("JwtSettings:Issuer", "test");
            builder.UseSetting("JwtSettings:Audience", "test");
            builder.UseSetting(
                "ConnectionStrings:Default",
                "Server=localhost;Database=test;User Id=sa;Password=test;TrustServerCertificate=True;Encrypt=False");
        });
    }

    [Fact]
    public async Task Get_menus_sin_token_401()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/SGR/Navegacion/menus");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Post_menu_admin_sin_token_401()
    {
        var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync(
            "/SGR/Menus/admin",
            new { titulo = "X", orden = 1 });
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Post_menu_admin_residente_403()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", CreateAccessToken("Residente"));

        var response = await client.PostAsJsonAsync(
            "/SGR/Menus/admin",
            new { titulo = "X", orden = 1 });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Get_menus_con_token_admin_no_401()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", CreateAccessToken("Administrador"));

        var response = await client.GetAsync("/SGR/Navegacion/menus");
        Assert.NotEqual(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.NotEqual(HttpStatusCode.Forbidden, response.StatusCode);
    }

    private static string CreateAccessToken(string perfil)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(JwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, "2"),
            new Claim("correo", "user@local"),
            new Claim("perfil", perfil),
        };
        var jwt = new JwtSecurityToken(
            issuer: "test",
            audience: "test",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(jwt);
    }

    public void Dispose() => _factory.Dispose();
}
