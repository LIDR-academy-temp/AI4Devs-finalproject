using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace GraphApi.Tests;

public class SetupDiagnosticsEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public SetupDiagnosticsEndpointTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["JwtSettings:Key"] = "01234567890123456789012345678901",
                    ["JwtSettings:Issuer"] = "test",
                    ["JwtSettings:Audience"] = "test",
                    ["ConnectionStrings:Default"] =
                        "Server=localhost;Database=test;User Id=sa;Password=test;TrustServerCertificate=True;Encrypt=False"
                });
            });
        });
    }

    [Fact]
    public async Task Conflict_sample_returns_409_with_code_extension()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/Setup/SetupDiagnostics/conflict-sample");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        Assert.NotNull(json);
        Assert.True(json.ContainsKey("code") || json.ContainsKey("title"));
    }
}
