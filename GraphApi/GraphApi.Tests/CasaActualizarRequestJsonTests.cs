using System.Text.Json;
using GraphApi.Models.SGR.Casas;

namespace GraphApi.Tests;

public class CasaActualizarRequestJsonTests
{
    private static readonly JsonSerializerOptions ApiOptions = new()
    {
        PropertyNamingPolicy = null,
        PropertyNameCaseInsensitive = true,
    };

    [Fact]
    public void Deserializa_body_camelCase_del_frontend()
    {
        const string json = """{"numero":"555","direccion":"cada 55","propietarioUsuarioId":1}""";
        var req = JsonSerializer.Deserialize<CasaActualizarRequest>(json, ApiOptions);
        Assert.NotNull(req);
        Assert.Equal("555", req.Numero);
        Assert.Equal("cada 55", req.Direccion);
        Assert.Equal(1, req.PropietarioUsuarioId);
    }

    [Fact]
    public void Deserializa_propietarioUsuarioId_vacio_como_null()
    {
        const string json = """{"numero":"555","direccion":"cada 55","propietarioUsuarioId":null}""";
        var req = JsonSerializer.Deserialize<CasaActualizarRequest>(json, ApiOptions);
        Assert.NotNull(req);
        Assert.Null(req.PropietarioUsuarioId);
    }

    [Fact]
    public void Deserializa_propietarioUsuarioId_string_vacio_falla_o_null()
    {
        const string json = """{"numero":"555","direccion":"cada 55","propietarioUsuarioId":""}""";
        try
        {
            var req = JsonSerializer.Deserialize<CasaActualizarRequest>(json, ApiOptions);
            Assert.True(req is null || req.PropietarioUsuarioId is null);
        }
        catch (JsonException)
        {
            // ASP.NET model binding también responde 400
        }
    }

    [Fact]
    public void Serializa_list_item_con_casaId_camelCase()
    {
        var dto = new CasaListItemDto { CasaId = 1, CondominioId = 1, Numero = "12" };
        var json = JsonSerializer.Serialize(dto, ApiOptions);
        Assert.Contains("\"casaId\":1", json);
    }
}
