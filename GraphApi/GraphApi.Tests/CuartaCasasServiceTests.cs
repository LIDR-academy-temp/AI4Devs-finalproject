using GraphApi.Infrastructure;
using GraphApi.Models.SGR.Casas;
using GraphApi.Repositories.SGR;
using GraphApi.Services.SGR.Casas;
using Microsoft.AspNetCore.Http;
using Moq;

namespace GraphApi.Tests;

public class CuartaCasasServiceTests
{
    private static (CuartaCasasService Sut, Mock<ICasasCuartaRepository> Repo, Mock<IUnitOfWork> Uow) Build()
    {
        var repo = new Mock<ICasasCuartaRepository>();
        var uow = new Mock<IUnitOfWork>();
        uow.Setup(u => u.BeginTransaction()).Returns(Mock.Of<System.Data.IDbTransaction>());
        return (new CuartaCasasService(repo.Object, uow.Object), repo, uow);
    }

    [Fact]
    public async Task CrearAsync_condominio_inexistente_404()
    {
        var (sut, repo, uow) = Build();
        repo.Setup(r => r.CondominioExisteAsync(99, It.IsAny<System.Data.IDbTransaction>()))
            .ReturnsAsync(false);

        var (data, code, status, _) = await sut.CrearAsync(
            new CasaCrearRequest { CondominioId = 99, Numero = "1", Direccion = "Calle" },
            1,
            "admin@local");

        Assert.Null(data);
        Assert.Equal("NOT_FOUND", code);
        Assert.Equal(StatusCodes.Status404NotFound, status);
        uow.Verify(u => u.Rollback(), Times.Once);
    }

    [Fact]
    public async Task CrearAsync_ok_201()
    {
        var (sut, repo, uow) = Build();
        var created = new CasaListItemDto
        {
            CasaId = 10,
            CondominioId = 1,
            CondominioNombre = "Cuarta",
            Numero = "E2E-1",
            Direccion = "Calle 1",
        };

        repo.Setup(r => r.CondominioExisteAsync(1, It.IsAny<System.Data.IDbTransaction>())).ReturnsAsync(true);
        repo.Setup(r => r.InsertCasaAsync(1, "Calle 1", "E2E-1", null, "admin@local", 1, It.IsAny<System.Data.IDbTransaction>()))
            .ReturnsAsync(10);
        repo.Setup(r => r.ObtenerCasaAsync(10, It.IsAny<CancellationToken>())).ReturnsAsync(created);

        var (data, code, status, _) = await sut.CrearAsync(
            new CasaCrearRequest { CondominioId = 1, Numero = "E2E-1", Direccion = "Calle 1" },
            1,
            "admin@local");

        Assert.NotNull(data);
        Assert.Null(code);
        Assert.Equal(StatusCodes.Status201Created, status);
        uow.Verify(u => u.Commit(), Times.Once);
    }
}
