using GraphApi.Models.FNZ;

namespace GraphApi.Tests;

public class RegistrarPagoRequestValidatorTests
{
    private readonly RegistrarPagoRequestValidator _validator = new();

    [Fact]
    public void Rejects_zero_monto()
    {
        var result = _validator.Validate(new RegistrarPagoRequest
        {
            MontoPagado = 0,
            FechaPago = DateTime.UtcNow,
            ReferenciaPago = "REF-1",
        });
        Assert.False(result.IsValid);
    }

    [Fact]
    public void Rejects_empty_referencia()
    {
        var result = _validator.Validate(new RegistrarPagoRequest
        {
            MontoPagado = 100,
            FechaPago = DateTime.UtcNow,
            ReferenciaPago = "",
        });
        Assert.False(result.IsValid);
    }
}
