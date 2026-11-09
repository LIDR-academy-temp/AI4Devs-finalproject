using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;

namespace GraphApi.Tests;

public class ReservacionesAdminAuthorizationTests : IDisposable
{
    private const string JwtKey = "01234567890123456789012345678901";
    private readonly WebApplicationFactory<Program> _factory;

    public ReservacionesAdminAuthorizationTests()
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
    public async Task Get_admin_reservaciones_residente_devuelve_403()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", CreateAccessToken("Residente"));

        var response = await client.GetAsync("/VTS/ReservacionesArea/admin?pagina=1&tamano=20");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    private static string CreateAccessToken(string perfil)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(JwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, "2"),
            new Claim("correo", "residente@local"),
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
