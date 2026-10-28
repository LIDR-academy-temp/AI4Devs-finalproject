using GraphApi.Models.SGR.Auth;

namespace GraphApi.Tests;

public class CambiarPasswordRequestValidatorTests
{
    private readonly CambiarPasswordRequestValidator _validator = new();

    [Fact]
    public void Short_new_password_fails()
    {
        var result = _validator.Validate(new CambiarPasswordRequest
        {
            PasswordActual = "actual12",
            PasswordNueva = "corta",
        });

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Same_password_fails()
    {
        var result = _validator.Validate(new CambiarPasswordRequest
        {
            PasswordActual = "misma1234",
            PasswordNueva = "misma1234",
        });

        Assert.False(result.IsValid);
    }
}
