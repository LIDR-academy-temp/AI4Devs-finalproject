using GraphApi.Models.FNZ;

namespace GraphApi.Tests;

public class GenerarCuotasRequestValidatorTests
{
    private readonly GenerarCuotasRequestValidator _validator = new();

    [Fact]
    public void Valid_request_passes()
    {
        var result = _validator.Validate(new GenerarCuotasRequest
        {
            Anio = 2026,
            Mes = 1,
            Monto = 500,
            FechaVencimiento = new DateTime(2026, 1, 31),
        });

        Assert.True(result.IsValid);
    }

    [Fact]
    public void Invalid_mes_fails()
    {
        var result = _validator.Validate(new GenerarCuotasRequest
        {
            Anio = 2026,
            Mes = 13,
            Monto = 500,
            FechaVencimiento = new DateTime(2026, 1, 31),
        });

        Assert.False(result.IsValid);
    }
}
