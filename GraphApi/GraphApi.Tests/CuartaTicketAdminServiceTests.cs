using GraphApi.Infrastructure;
using GraphApi.Models.TKT;
using GraphApi.Models.TKT.Tickets;
using GraphApi.Repositories.TKT;
using GraphApi.Services.NTF;
using GraphApi.Services.TKT;
using Microsoft.AspNetCore.Http;
using Moq;
using System.Data;

namespace GraphApi.Tests;

public class CuartaTicketAdminServiceTests
{
    [Fact]
    public async Task CrearTicketAdmin_solicitante_invalido_returns_400()
    {
        var repo = new Mock<ICuartaTicketAdminRepository>();
        repo.Setup(r => r.IsResidenteActivoAsync(99, It.IsAny<IDbTransaction>())).ReturnsAsync(false);

        var uow = new Mock<IUnitOfWork>();
        uow.Setup(u => u.BeginTransaction()).Returns(Mock.Of<IDbTransaction>());

        var sut = CreateSut(repo.Object, uow: uow.Object);

        var (ticket, code, status, _) = await sut.CrearTicketAdminAsync(
            new CrearTicketAdminInput
            {
                UsuarioSolicitanteId = 99,
                Titulo = "T",
                Descripcion = "D",
                Categoria = "Agua",
            },
            1,
            "admin@test.com");

        Assert.Null(ticket);
        Assert.Equal("VALIDATION_ERROR", code);
        Assert.Equal(StatusCodes.Status400BadRequest, status);
        uow.Verify(u => u.Rollback(), Times.Once);
    }

    [Fact]
    public async Task ActualizarMetadatos_ticket_cerrado_returns_422()
    {
        var repo = new Mock<ICuartaTicketAdminRepository>();
        repo.Setup(r => r.GetTicketEstadoAsync(1, It.IsAny<IDbTransaction>()))
            .ReturnsAsync((1, 4, "Cerrado", 10, "Titulo"));

        var uow = new Mock<IUnitOfWork>();
        uow.Setup(u => u.BeginTransaction()).Returns(Mock.Of<IDbTransaction>());

        var sut = CreateSut(repo.Object, uow: uow.Object);

        var (ok, code, status, _) = await sut.ActualizarMetadatosAsync(
            1,
            new ActualizarTicketAdminInput
            {
                Titulo = "Nuevo",
                Descripcion = "Desc",
                Categoria = "Agua",
            },
            1,
            "admin@test.com");

        Assert.False(ok);
        Assert.Equal("TICKET_CLOSED", code);
        Assert.Equal(StatusCodes.Status422UnprocessableEntity, status);
    }

    [Fact]
    public async Task SoftDelete_ticket_inexistente_returns_404()
    {
        var repo = new Mock<ICuartaTicketAdminRepository>();
        repo.Setup(r => r.GetTicketEstadoAsync(404, It.IsAny<IDbTransaction>()))
            .ReturnsAsync(((int, int, string, int, string)?)null);

        var uow = new Mock<IUnitOfWork>();
        uow.Setup(u => u.BeginTransaction()).Returns(Mock.Of<IDbTransaction>());

        var sut = CreateSut(repo.Object, uow: uow.Object);

        var (ok, code, status, _) = await sut.SoftDeleteAsync(404, 1, "admin@test.com");

        Assert.False(ok);
        Assert.Equal("NOT_FOUND", code);
        Assert.Equal(StatusCodes.Status404NotFound, status);
    }

    [Fact]
    public async Task CrearTicketAdmin_valido_returns_201()
    {
        var repo = new Mock<ICuartaTicketAdminRepository>();
        repo.Setup(r => r.IsResidenteActivoAsync(5, It.IsAny<IDbTransaction>())).ReturnsAsync(true);

        var catalogos = new Mock<ITicketCatalogoRepository>();
        catalogos.Setup(c => c.ResolveEstadoIdAsync("Nuevo", It.IsAny<IDbTransaction>())).ReturnsAsync(1);
        catalogos.Setup(c => c.ResolvePrioridadIdAsync("Media", It.IsAny<IDbTransaction>())).ReturnsAsync(2);
        catalogos.Setup(c => c.ResolveCategoriaIdAsync("Agua", It.IsAny<IDbTransaction>())).ReturnsAsync(3);
        catalogos.Setup(c => c.ResolveCanalIdAsync("WEB", It.IsAny<IDbTransaction>())).ReturnsAsync(1);

        var tickets = new Mock<ICuartaTicketRepository>();
        tickets.Setup(t => t.InsertarAsync(It.IsAny<CrearTicketInsertArgs>(), It.IsAny<IDbTransaction>()))
            .ReturnsAsync(42);
        tickets.Setup(t => t.ObtenerVistaAsync(42)).ReturnsAsync(new clReadTickets { TicketID = 42 });

        var notif = new Mock<INotificacionService>();
        var uow = new Mock<IUnitOfWork>();
        uow.Setup(u => u.BeginTransaction()).Returns(Mock.Of<IDbTransaction>());

        var sut = CreateSut(repo.Object, catalogos.Object, tickets.Object, notif.Object, uow.Object);

        var (ticket, code, status, _) = await sut.CrearTicketAdminAsync(
            new CrearTicketAdminInput
            {
                UsuarioSolicitanteId = 5,
                Titulo = "T",
                Descripcion = "D",
                Categoria = "Agua",
            },
            1,
            "admin@test.com");

        Assert.NotNull(ticket);
        Assert.Equal(42, ticket!.TicketID);
        Assert.Null(code);
        Assert.Equal(StatusCodes.Status201Created, status);
        uow.Verify(u => u.Commit(), Times.Once);
    }

    private static CuartaTicketAdminService CreateSut(
        ICuartaTicketAdminRepository repo,
        ITicketCatalogoRepository? catalogos = null,
        ICuartaTicketRepository? tickets = null,
        INotificacionService? notificaciones = null,
        IUnitOfWork? uow = null) =>
        new(
            repo,
            catalogos ?? Mock.Of<ITicketCatalogoRepository>(),
            tickets ?? Mock.Of<ICuartaTicketRepository>(),
            notificaciones ?? Mock.Of<INotificacionService>(),
            uow ?? Mock.Of<IUnitOfWork>());
}
