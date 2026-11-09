namespace GraphApi.Tests;

using GraphApi.Models.SGR.Usuarios;

public class ActualizarPerfilRequestValidatorTests
{
    private readonly ActualizarPerfilRequestValidator _validator = new();

    [Fact]
    public void Rejects_invalid_email()
    {
        var result = _validator.Validate(new ActualizarPerfilRequest
        {
            Correo = "not-an-email",
            Telefono = "5512345678",
        });
        Assert.False(result.IsValid);
    }

    [Fact]
    public void Accepts_valid_contact()
    {
        var result = _validator.Validate(new ActualizarPerfilRequest
        {
            Correo = "user@example.com",
            Telefono = "5512345678",
        });
        Assert.True(result.IsValid);
    }
}
