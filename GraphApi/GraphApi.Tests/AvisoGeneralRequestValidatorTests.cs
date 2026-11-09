using GraphApi.Models.NTF;
using GraphApi.Models.NTF.Validators;

namespace GraphApi.Tests;

public class AvisoGeneralRequestValidatorTests
{
    private readonly AvisoGeneralRequestValidator _validator = new();

    [Fact]
    public void Request_valido_pasa()
    {
        var result = _validator.Validate(new AvisoGeneralRequest { Titulo = "Aviso", Mensaje = "Texto" });
        Assert.True(result.IsValid);
    }

    [Fact]
    public void Titulo_vacio_falla()
    {
        var result = _validator.Validate(new AvisoGeneralRequest { Titulo = "", Mensaje = "Texto" });
        Assert.False(result.IsValid);
    }
}
