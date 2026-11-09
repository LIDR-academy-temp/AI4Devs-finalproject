using System.Text.Json;
using GraphApi.Models.TKT;
using GraphApi.Models.VTS.CuartaVisitas;

namespace GraphApi.Tests;

public class ReservacionAdminItemJsonTests
{
    private static readonly JsonSerializerOptions ApiOptions = new()
    {
        PropertyNamingPolicy = null,
        PropertyNameCaseInsensitive = true,
    };

    [Fact]
    public void Serializa_pagina_admin_con_items_camelCase()
    {
        var page = new PaginaDto<ReservacionAdminItemDto>
        {
            Pagina = 1,
            Total = 1,
            Items =
            [
                new ReservacionAdminItemDto
                {
                    ReservacionAreaId = 9,
                    AreaComunId = 2,
                    AreaComun = "Salon",
                    UsuarioNombre = "Ana",
                    UsuarioCorreo = "ana@local",
                    Estado = "Confirmada",
                },
            ],
        };

        var json = JsonSerializer.Serialize(page, ApiOptions);
        Assert.Contains("\"reservacionAreaId\":9", json);
        Assert.Contains("\"usuarioNombre\":\"Ana\"", json);
        Assert.Contains("\"items\":[", json);
    }
}
