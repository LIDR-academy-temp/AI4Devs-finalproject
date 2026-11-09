using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using FluentValidation;
using GraphApi.Controllers.TKT.Tickets;
using GraphApi.Models.TKT;
using GraphApi.Models.TKT.Tickets;
using GraphApi.Models.TKT.Validators;
using GraphApi.Services.TKT;
using GraphApi.Services.TKT.Tickets;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace GraphApi.Tests;

public class TicketsAsignadosEndpointTests
{
    private static TicketsController CreateController(
        ClaimsPrincipal user,
        ICuartaTicketQueryService? query = null)
    {
        var ticketQuery = query ?? Mock.Of<ICuartaTicketQueryService>();
        var controller = new TicketsController(
            Mock.Of<ITicketsService>(),
            Mock.Of<ICuartaTicketService>(),
            ticketQuery,
            Mock.Of<ICuartaTicketAdminService>(),
            Mock.Of<ICuartaTicketDetalleService>(),
            Mock.Of<IValidator<clCreateTickets>>(),
            Mock.Of<IValidator<CrearTicketInput>>(),
            new TicketFiltroDtoValidator(),
            new TicketAsignadosFiltroDtoValidator(),
            Mock.Of<IValidator<clUpdateTickets>>(),
            Mock.Of<IValidator<CrearComentarioTicketInput>>(),
            Mock.Of<IValidator<CrearTicketAdminInput>>(),
            Mock.Of<IValidator<ActualizarTicketAdminInput>>())
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user },
            },
        };
        return controller;
    }

    private static ClaimsPrincipal UserWithPerfil(int usuarioId, string perfil)
    {
        return new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(JwtRegisteredClaimNames.Sub, usuarioId.ToString()),
            new Claim("perfil", perfil),
        ],
        "Test"));
    }

    [Fact]
    public async Task GetTicketsAsignados_trabajador_returns_200()
    {
        var query = new Mock<ICuartaTicketQueryService>();
        query.Setup(q => q.GetTicketsAsignadosAsync(
                7,
                It.Is<TicketAsignadosFiltroDto>(f => f.Terminado == false),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PaginaDto<MiTicketItemDto>
            {
                Pagina = 1,
                Total = 1,
                Items = [new MiTicketItemDto { TicketId = 3, Titulo = "Fuga" }],
            });

        var controller = CreateController(UserWithPerfil(7, "Trabajador"), query.Object);
        var result = await controller.GetTicketsAsignados(false, null, 1, 20, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var page = Assert.IsType<PaginaDto<MiTicketItemDto>>(ok.Value);
        Assert.Single(page.Items);
        query.Verify(
            q => q.GetTicketsAsignadosAsync(7, It.IsAny<TicketAsignadosFiltroDto>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task GetTicketsAsignados_residente_returns_403()
    {
        var controller = CreateController(UserWithPerfil(7, "Residente"));
        var result = await controller.GetTicketsAsignados(false, null, 1, 20, CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, problem.StatusCode);
    }

    [Fact]
    public async Task GetTicketsAsignados_admin_returns_403()
    {
        var controller = CreateController(UserWithPerfil(1, "Administrador"));
        var result = await controller.GetTicketsAsignados(false, null, 1, 20, CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, problem.StatusCode);
    }
}
