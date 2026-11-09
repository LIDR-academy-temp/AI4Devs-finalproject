using GraphApi.Models.VTS.CuartaVisitasGeneradas;
using GraphApi.Repositories.VTS;
using GraphApi.Services.VTS.CuartaVisitasGeneradas;
using Microsoft.AspNetCore.Http;
using Moq;
using System.Data;

namespace GraphApi.Tests;

public class CuartaVisitasGeneradasServiceTests
{
    private static CuartaVisitasGeneradasService CreateSut(Mock<ICuartaVisitasGeneradasRepository> repo)
    {
        var visitasRepo = new Mock<ICuartaVisitasRepository>();
        var db = new Mock<IDbConnection>();
        db.Setup(d => d.State).Returns(ConnectionState.Open);
        db.Setup(d => d.BeginTransaction()).Returns(Mock.Of<IDbTransaction>());
        return new CuartaVisitasGeneradasService(repo.Object, visitasRepo.Object, db.Object);
    }

    [Fact]
    public async Task Validar_vigente_returns_Valido()
    {
        var repo = new Mock<ICuartaVisitasGeneradasRepository>();
        repo.Setup(r => r.GetByCodigoAsync("ABC", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PaseVisitaDto
            {
                CodigoQr = "ABC",
                FechaExpira = DateTime.UtcNow.AddHours(2),
                BUsado = false,
            });

        var sut = CreateSut(repo);
        var result = await sut.ValidarAsync("ABC");

        Assert.Equal("Valido", result.Estado);
        Assert.NotNull(result.Pase);
    }

    [Fact]
    public async Task Validar_usado_returns_Usado()
    {
        var repo = new Mock<ICuartaVisitasGeneradasRepository>();
        repo.Setup(r => r.GetByCodigoAsync("X", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PaseVisitaDto { CodigoQr = "X", BUsado = true, FechaExpira = DateTime.UtcNow.AddHours(1) });

        var sut = CreateSut(repo);
        var result = await sut.ValidarAsync("X");

        Assert.Equal("Usado", result.Estado);
    }

    [Fact]
    public async Task ListMias_only_returns_repo_rows_for_user()
    {
        var repo = new Mock<ICuartaVisitasGeneradasRepository>();
        repo.Setup(r => r.ListMiasAsync(7, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<PaseVisitaDto>
            {
                new() { VisitaGeneradaId = 1, CodigoQr = "A", BUsado = false, FechaExpira = DateTime.UtcNow.AddHours(1) },
            });

        var sut = CreateSut(repo);
        var list = await sut.ListMiasAsync(7);

        Assert.Single(list);
        Assert.Equal("vigente", list[0].EstadoLista);
        repo.Verify(r => r.ListMiasAsync(7, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CrearPase_sin_nombre_returns_422()
    {
        var repo = new Mock<ICuartaVisitasGeneradasRepository>();
        var sut = CreateSut(repo);

        var (pase, code, status, _) = await sut.CrearPaseAsync(
            new CrearPaseRequest { NombreVisitante = "  ", FechaInicio = DateTime.UtcNow, FechaFin = DateTime.UtcNow.AddHours(2) },
            1,
            "a@test.com");

        Assert.Null(pase);
        Assert.Equal("PASE_NOMBRE_REQUERIDO", code);
        Assert.Equal(StatusCodes.Status422UnprocessableEntity, status);
    }

    [Fact]
    public void ResolverEstadoValidacion_no_vigente_before_start()
    {
        var pase = new PaseVisitaDto
        {
            BUsado = false,
            UnaOcasion = true,
            FechaEmision = DateTime.UtcNow.AddHours(2),
            FechaExpira = DateTime.UtcNow.AddHours(5),
        };
        Assert.Equal("NoVigente", CuartaVisitasGeneradasService.ResolverEstadoValidacion(pase));
    }

    [Fact]
    public void ResolverEstadoValidacion_rango_not_usado_when_bUsado()
    {
        var pase = new PaseVisitaDto
        {
            BUsado = true,
            UnaOcasion = false,
            FechaEmision = DateTime.UtcNow.AddHours(-1),
            FechaExpira = DateTime.UtcNow.AddDays(2),
        };
        Assert.Equal("Valido", CuartaVisitasGeneradasService.ResolverEstadoValidacion(pase));
    }

    [Fact]
    public void ResolverEstadoValidacion_expirado_when_past()
    {
        var pase = new PaseVisitaDto
        {
            BUsado = false,
            FechaExpira = DateTime.UtcNow.AddMinutes(-5),
        };
        Assert.Equal("Expirado", CuartaVisitasGeneradasService.ResolverEstadoValidacion(pase));
    }
}
