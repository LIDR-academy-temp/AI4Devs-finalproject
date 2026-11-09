using GraphApi.Infrastructure.Security;

namespace GraphApi.Tests;

public class SecurePasswordGeneratorTests
{
    private readonly SecurePasswordGenerator _generator = new();

    [Fact]
    public void Generar_returns_12_chars_by_default()
    {
        var pwd = _generator.Generar();
        Assert.Equal(12, pwd.Length);
    }

    [Fact]
    public void Generar_produces_different_values()
    {
        var a = _generator.Generar();
        var b = _generator.Generar();
        Assert.NotEqual(a, b);
    }
}
