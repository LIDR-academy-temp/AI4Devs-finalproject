using GraphApi.Models.TKT;
using GraphApi.Repositories.TKT;
using GraphApi.Services.TKT;
using Microsoft.AspNetCore.Http;
using Moq;

namespace GraphApi.Tests;

public class CuartaTicketCatalogoAdminServiceTests
{
    [Fact]
    public async Task EliminarCategoria_en_uso_returns_409()
    {
        var repo = new Mock<ITicketCatalogoRepository>();
        repo.Setup(r => r.ExistsTicketsConCategoriaAsync(1, null)).ReturnsAsync(true);

        var sut = new CuartaTicketCatalogoAdminService(repo.Object);
        var (ok, code, status, _) = await sut.EliminarCategoriaAsync(1, 1, "a@test.com");

        Assert.False(ok);
        Assert.Equal("CATALOG_IN_USE", code);
        Assert.Equal(StatusCodes.Status409Conflict, status);
    }

    [Fact]
    public async Task CrearCategoria_valida_returns_201()
    {
        var repo = new Mock<ITicketCatalogoRepository>();
        repo.Setup(r => r.InsertCategoriaAsync("Plomería", "a@test.com", 1, null)).ReturnsAsync(9);

        var sut = new CuartaTicketCatalogoAdminService(repo.Object);
        var (data, code, status, _) = await sut.CrearCategoriaAsync(
            new UpsertCategoriaTicketInput { Nombre = "Plomería" }, 1, "a@test.com");

        Assert.NotNull(data);
        Assert.Equal(9, data!.Id);
        Assert.Null(code);
        Assert.Equal(StatusCodes.Status201Created, status);
    }
}
