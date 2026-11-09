using GraphApi.Infrastructure;
using GraphApi.Models.NTF;
using GraphApi.Models.TKT;
using GraphApi.Models.TKT.Tickets;
using GraphApi.Repositories.TKT;
using GraphApi.Services.NTF;
using GraphApi.Services.TKT;
using Microsoft.AspNetCore.Http;
using Moq;
using System.Data;

namespace GraphApi.Tests;

public class CuartaTicketServiceTests
{
    [Fact]
    public async Task CrearTicket_non_residente_returns_403()
    {
        var sut = new CuartaTicketService(
            Mock.Of<ITicketCatalogoRepository>(),
            Mock.Of<ICuartaTicketRepository>(),
            Mock.Of<INotificacionService>(),
            Mock.Of<IUnitOfWork>());

        var (ticket, code, status, _) = await sut.CrearTicketAsync(
            new CrearTicketInput { Titulo = "T", Descripcion = "D", Categoria = "Agua" },
            1,
            "r@test.com",
            "Administrador");

        Assert.Null(ticket);
        Assert.Equal("FORBIDDEN", code);
        Assert.Equal(StatusCodes.Status403Forbidden, status);
    }

    [Fact]
    public async Task CrearTicket_sin_canales_ticket_continua_y_retorna_201()
    {
        var catalogos = new Mock<ITicketCatalogoRepository>();
        catalogos.Setup(c => c.ResolveEstadoIdAsync("Nuevo", It.IsAny<IDbTransaction>())).ReturnsAsync(1);
        catalogos.Setup(c => c.ResolvePrioridadIdAsync("Alta", It.IsAny<IDbTransaction>())).ReturnsAsync(3);
        catalogos.Setup(c => c.ResolveCategoriaIdAsync("JARDIN", It.IsAny<IDbTransaction>())).ReturnsAsync(2);
        catalogos
            .Setup(c => c.ResolveCanalIdAsync("WEB", It.IsAny<IDbTransaction>()))
            .ReturnsAsync((int?)null);

        var tickets = new Mock<ICuartaTicketRepository>();
        tickets
            .Setup(t => t.InsertarAsync(It.IsAny<CrearTicketInsertArgs>(), It.IsAny<IDbTransaction>()))
            .ReturnsAsync(99);
        tickets.Setup(t => t.ObtenerVistaAsync(99)).ReturnsAsync(new clReadTickets { TicketID = 99 });

        var notif = new Mock<INotificacionService>();
        notif
            .Setup(n => n.NotificarAdministradoresAsync(
                It.IsAny<IDbTransaction>(),
                "TICKET_NUEVO",
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<NotificacionAutor>()))
            .ReturnsAsync(1);

        var uow = new Mock<IUnitOfWork>();
        uow.Setup(u => u.BeginTransaction()).Returns(Mock.Of<IDbTransaction>());

        var sut = new CuartaTicketService(catalogos.Object, tickets.Object, notif.Object, uow.Object);

        var (ticket, code, status, _) = await sut.CrearTicketAsync(
            new CrearTicketInput
            {
                Titulo = "no cortaron mi pasto",
                Descripcion = "detalle",
                Categoria = "JARDIN",
                Prioridad = "Alta",
            },
            5,
            "cond@test.com",
            "Residente");

        Assert.NotNull(ticket);
        Assert.Equal(99, ticket!.TicketID);
        Assert.Null(code);
        Assert.Equal(StatusCodes.Status201Created, status);
    }
}
