using GraphApi.Models.SGR.Casas;

namespace GraphApi.Tests;

public class CasaActualizarRequestValidatorTests
{
    private readonly CasaActualizarRequestValidator _validator = new();

    [Fact]
    public void Request_valido_pasa()
    {
        var result = _validator.Validate(new CasaActualizarRequest
        {
            Numero = "555",
            Direccion = "cada 55",
            PropietarioUsuarioId = 1,
        });
        Assert.True(result.IsValid);
    }

    [Fact]
    public void Numero_vacio_falla()
    {
        var result = _validator.Validate(new CasaActualizarRequest
        {
            Numero = "",
            Direccion = "ok",
        });
        Assert.False(result.IsValid);
    }
}
