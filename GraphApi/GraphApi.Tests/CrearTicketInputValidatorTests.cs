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

    // La prioridad es catálogo por nombre (CLAUDE.md): el validador solo revisa formato;
    // la existencia en catálogo la valida el servicio (ver CuartaTicketAdminServiceTests).
    [Fact]
    public void Prioridad_fuera_de_catalogo_pasa_validacion_de_formato()
    {
        var result = _validator.Validate(new CrearTicketInput
        {
            Titulo = "T",
            Descripcion = "D",
            Categoria = "Agua",
            Prioridad = "Urgente",
        });

        Assert.True(result.IsValid);
    }

    [Fact]
    public void Prioridad_demasiado_larga_fails()
    {
        var result = _validator.Validate(new CrearTicketInput
        {
            Titulo = "T",
            Descripcion = "D",
            Categoria = "Agua",
            Prioridad = new string('x', 101),
        });

        Assert.False(result.IsValid);
    }
}
