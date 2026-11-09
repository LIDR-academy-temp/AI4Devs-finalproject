using GraphApi.Models.SGR.Usuarios;

namespace GraphApi.Tests;

public class CrearUsuarioAdminRequestValidatorTests
{
    private readonly CrearUsuarioAdminRequestValidator _validator = new();

    [Fact]
    public void Valid_residente_passes()
    {
        var result = _validator.Validate(new CrearUsuarioAdminRequest
        {
            Nombre = "Juan Pérez",
            Correo = "juan@test.com",
            Perfil = "Residente",
            CasaId = 1,
        });

        Assert.True(result.IsValid);
    }

    [Fact]
    public void Invalid_perfil_fails()
    {
        var result = _validator.Validate(new CrearUsuarioAdminRequest
        {
            Nombre = "X",
            Correo = "x@test.com",
            Perfil = "SuperUser",
        });

        Assert.False(result.IsValid);
    }
}
