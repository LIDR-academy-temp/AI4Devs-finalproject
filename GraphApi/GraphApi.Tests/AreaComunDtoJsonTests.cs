using System.Text.Json;
using GraphApi.Models.VTS.CuartaVisitas;

namespace GraphApi.Tests;

public class AreaComunDtoJsonTests
{
    private static readonly JsonSerializerOptions ApiOptions = new()
    {
        PropertyNamingPolicy = null,
        PropertyNameCaseInsensitive = true,
    };

    [Fact]
    public void Serializa_area_comun_camelCase_para_SPA()
    {
        var dto = new AreaComunDto
        {
            AreaComunId = 2,
            Nombre = "Salon de eventos",
            Descripcion = "Salon cerrado",
            Capacidad = 80,
            RequiereReservacion = true,
        };

        var json = JsonSerializer.Serialize(dto, ApiOptions);
        Assert.Contains("\"areaComunId\":2", json);
        Assert.Contains("\"nombre\":\"Salon de eventos\"", json);
        Assert.Contains("\"requiereReservacion\":true", json);
    }
}
