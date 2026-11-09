using GraphApi.Infrastructure;
using GraphApi.Models.TKT;
using GraphApi.Repositories.TKT;
using GraphApi.Services.TKT;
using Microsoft.AspNetCore.Http;
using Moq;

namespace GraphApi.Tests;

public class CuartaTicketDetalleServiceTests
{
    private static CuartaTicketDetalleService CreateSut(
        Mock<ICuartaTicketDetalleRepository> repo,
        Mock<IUnitOfWork>? uow = null)
    {
        var uowMock = uow ?? new Mock<IUnitOfWork>();
        uowMock.Setup(u => u.BeginTransaction()).Returns(Mock.Of<System.Data.IDbTransaction>());
        return new CuartaTicketDetalleService(repo.Object, uowMock.Object);
    }

    [Fact]
    public async Task GetDetalle_solicitante_propio_returns_200()
    {
        var repo = new Mock<ICuartaTicketDetalleRepository>();
        repo.Setup(r => r.GetDetalleAsync(10, It.IsAny<CancellationToken>()))
            .ReturnsAsync((5, new TicketDetalleDto { TicketId = 10, Titulo = "T" }));

        var sut = CreateSut(repo);
        var (detalle, code, status, _) = await sut.GetDetalleAsync(10, 5, "Residente");

        Assert.NotNull(detalle);
        Assert.Null(code);
        Assert.Equal(StatusCodes.Status200OK, status);
    }

    [Fact]
    public async Task GetDetalle_ticket_ajeno_returns_404_forbidden()
    {
        var repo = new Mock<ICuartaTicketDetalleRepository>();
        repo.Setup(r => r.GetDetalleAsync(99, It.IsAny<CancellationToken>()))
            .ReturnsAsync((2, new TicketDetalleDto { TicketId = 99 }));

        var sut = CreateSut(repo);
        var (detalle, code, status, _) = await sut.GetDetalleAsync(99, 5, "Residente");

        Assert.Null(detalle);
        Assert.Equal("NOT_FOUND", code);
        Assert.Equal(StatusCodes.Status404NotFound, status);
    }

    [Fact]
    public async Task ListComentarios_residente_excluye_internos()
    {
        var repo = new Mock<ICuartaTicketDetalleRepository>();
        repo.Setup(r => r.GetDetalleAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync((7, new TicketDetalleDto { TicketId = 1 }));
        repo.Setup(r => r.ListComentariosAsync(1, false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<ComentarioTicketDto>
            {
                new() { Comentario = "publico", EsInterno = false },
            });

        var sut = CreateSut(repo);
        var (items, code, status, _) = await sut.ListComentariosAsync(1, 7, "Residente");

        Assert.NotNull(items);
        Assert.Single(items!);
        Assert.Null(code);
        Assert.Equal(StatusCodes.Status200OK, status);
        repo.Verify(r => r.ListComentariosAsync(1, false, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetDetalle_trabajador_asignado_returns_200()
    {
        var repo = new Mock<ICuartaTicketDetalleRepository>();
        repo.Setup(r => r.GetDetalleAsync(3, It.IsAny<CancellationToken>()))
            .ReturnsAsync((9, new TicketDetalleDto { TicketId = 3 }));
        repo.Setup(r => r.IsAsignadoActivoAsync(3, 11, It.IsAny<System.Data.IDbTransaction>()))
            .ReturnsAsync(true);

        var sut = CreateSut(repo);
        var (detalle, code, status, _) = await sut.GetDetalleAsync(3, 11, "Trabajador");

        Assert.NotNull(detalle);
        Assert.Null(code);
        Assert.Equal(StatusCodes.Status200OK, status);
    }

    [Fact]
    public async Task GetDetalle_trabajador_no_asignado_returns_404()
    {
        var repo = new Mock<ICuartaTicketDetalleRepository>();
        repo.Setup(r => r.GetDetalleAsync(3, It.IsAny<CancellationToken>()))
            .ReturnsAsync((9, new TicketDetalleDto { TicketId = 3 }));
        repo.Setup(r => r.IsAsignadoActivoAsync(3, 11, It.IsAny<System.Data.IDbTransaction>()))
            .ReturnsAsync(false);

        var sut = CreateSut(repo);
        var (detalle, code, status, _) = await sut.GetDetalleAsync(3, 11, "Trabajador");

        Assert.Null(detalle);
        Assert.Equal("NOT_FOUND", code);
        Assert.Equal(StatusCodes.Status404NotFound, status);
    }

    [Fact]
    public async Task AgregarComentario_residente_no_puede_marcar_interno()
    {
        var repo = new Mock<ICuartaTicketDetalleRepository>();
        repo.Setup(r => r.SupportsComentariosInternos).Returns(true);
        repo.Setup(r => r.GetDetalleAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync((7, new TicketDetalleDto { TicketId = 1 }));
        repo.Setup(r => r.InsertComentarioAsync(
                1, 7, "r@test.com", "hola", false, It.IsAny<System.Data.IDbTransaction>()))
            .ReturnsAsync(100);

        var uow = new Mock<IUnitOfWork>();
        uow.Setup(u => u.BeginTransaction()).Returns(Mock.Of<System.Data.IDbTransaction>());
        var sut = new CuartaTicketDetalleService(repo.Object, uow.Object);

        var (item, code, _, _) = await sut.AgregarComentarioAsync(
            1,
            new CrearComentarioTicketInput { Comentario = "hola", EsInterno = true },
            7,
            "r@test.com",
            "Residente");

        Assert.NotNull(item);
        Assert.Null(code);
        Assert.False(item!.EsInterno);
        repo.Verify(r => r.InsertComentarioAsync(
            1, 7, "r@test.com", "hola", false, It.IsAny<System.Data.IDbTransaction>()), Times.Once);
    }
}
