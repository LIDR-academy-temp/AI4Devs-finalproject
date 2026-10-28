using GraphApi.Models.TKT;
using GraphApi.Models.TKT.Validators;

namespace GraphApi.Tests;

public class CrearTicketInputValidatorTests
{
    private readonly CrearTicketInputValidator _validator = new();

    [Fact]
    public void Valid_input_passes()
    {
        var result = _validator.Validate(new CrearTicketInput
        {
            Titulo = "Fuga de agua",
            Descripcion = "Hay humedad en el pasillo",
            Categoria = "Agua",
            Prioridad = "Media",
            Canal = "WEB",
        });

        Assert.True(result.IsValid);
    }

    [Fact]
    public void Empty_titulo_fails()
    {
        var result = _validator.Validate(new CrearTicketInput
        {
            Titulo = "",
            Descripcion = "x",
            Categoria = "Agua",
        });

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Invalid_prioridad_fails()
    {
        var result = _validator.Validate(new CrearTicketInput
        {
            Titulo = "T",
            Descripcion = "D",
            Categoria = "Agua",
            Prioridad = "Urgente",
        });

        Assert.False(result.IsValid);
    }
}
