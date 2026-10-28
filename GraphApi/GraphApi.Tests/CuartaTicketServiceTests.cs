using GraphApi.Infrastructure;
using GraphApi.Models.TKT;
using GraphApi.Repositories.TKT;
using GraphApi.Services.NTF;
using GraphApi.Services.TKT;
using Microsoft.AspNetCore.Http;
using Moq;

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
}
