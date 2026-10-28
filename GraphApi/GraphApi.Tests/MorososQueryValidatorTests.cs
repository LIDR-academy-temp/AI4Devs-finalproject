using GraphApi.Models.FNZ;

namespace GraphApi.Tests;

public class MorososQueryValidatorTests
{
    private readonly MorososQueryValidator _validator = new();

    [Fact]
    public void Accepts_no_filter()
    {
        var result = _validator.Validate(new MorososQuery());
        Assert.True(result.IsValid);
    }

    [Fact]
    public void Rejects_mes_without_anio()
    {
        var result = _validator.Validate(new MorososQuery { Mes = 9 });
        Assert.False(result.IsValid);
    }

    [Fact]
    public void Rejects_mes_13()
    {
        var result = _validator.Validate(new MorososQuery { Mes = 13, Anio = 2026 });
        Assert.False(result.IsValid);
    }

    [Fact]
    public void Accepts_valid_period()
    {
        var result = _validator.Validate(new MorososQuery { Mes = 9, Anio = 2026 });
        Assert.True(result.IsValid);
    }
}
