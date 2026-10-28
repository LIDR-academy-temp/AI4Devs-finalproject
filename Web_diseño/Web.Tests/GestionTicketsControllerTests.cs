using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Moq;
using System.Security.Claims;
using Web.Models.Admin;
using Web.Services;
using Xunit;
using GestionTicketsController = Web.Controllers.Catalogos.TicketsController;

namespace Web.Tests;

public sealed class GestionTicketsControllerTests
{
    private static GestionTicketsController CreateController(Mock<IGraphApiBackendService> backend, ClaimsPrincipal? user = null)
    {
        var env = new Mock<IWebHostEnvironment>(MockBehavior.Loose);
        env.SetupGet(item => item.WebRootPath).Returns(Path.GetTempPath());

        var controller = new GestionTicketsController(backend.Object, env.Object);
        var httpContext = new DefaultHttpContext
        {
            User = user ?? new ClaimsPrincipal(new ClaimsIdentity())
        };

        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
        controller.TempData = new TempDataDictionary(httpContext, Mock.Of<ITempDataProvider>());
        return controller;
    }

    private static ClaimsPrincipal CreateAdminUser()
    {
        var claims = new List<Claim>
        {
            new(CotoContext.UsuarioIdClaim, "1"),
            new(CotoContext.EsAdminClaim, "true"),
            new(ClaimTypes.Name, "Admin Demo")
        };

        return new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"));
    }

    private static void SetupBoard(Mock<IGraphApiBackendService> backend)
    {
        backend.Setup(service => service.GetTicketsAsync()).ReturnsAsync(new[]
        {
            new TicketBoardItemViewModel
            {
                TicketID = 1,
                TituloTicket = "Portón atorado",
                DescripcionTicket = "El portón principal no abre correctamente.",
                UsuarioSolicitanteID = 5,
                PrioridadTicketID = 1,
                EstadoTicketID = 1,
                FechaCreacionTicket = DateTime.UtcNow.AddHours(-4)
            }
        });
        backend.Setup(service => service.GetEstadosTicketsAsync()).ReturnsAsync(new[]
        {
            new TicketBoardStateLookupViewModel { EstadoTicketID = 1, EstadoTicket = "Abierto", bEliminado = false },
            new TicketBoardStateLookupViewModel { EstadoTicketID = 2, EstadoTicket = "Cerrado", bEliminado = false }
        });
        backend.Setup(service => service.GetPrioridadTicketsAsync()).ReturnsAsync(new[]
        {
            new TicketBoardPriorityLookupViewModel { PrioridadTicketID = 1, PrioridadTicket = "Alta", bEliminado = false }
        });
        backend.Setup(service => service.GetComentariosTicketsAsync()).ReturnsAsync(new[]
        {
            new TicketBoardCommentViewModel { ComentarioTicketID = 3, TicketID = 1, UsuarioID = 5, NombreUsuario = "Ana López", Comentario = "Revisando evidencia.", FechaComentario = DateTime.UtcNow.AddHours(-1) }
        });
        backend.Setup(service => service.GetTicketsUsuariosAsignadosAsync()).ReturnsAsync(new[]
        {
            new TicketBoardAssignmentViewModel { TicketsUsuariosAsignadosID = 4, TicketID = 1, UsuarioID = 6, UsuarioAsignado = "Carlos Ruiz", Terminado = false }
        });
        backend.Setup(service => service.GetTicketAttachmentsAsync()).ReturnsAsync(Array.Empty<TicketBoardAttachmentViewModel>());
        backend.Setup(service => service.GetUsuariosAsync()).ReturnsAsync(new[]
        {
            new UsuarioLookupViewModel { UsuarioID = 5, NombreUsuario = "Ana López", CorreoUsuario = "ana@example.com" },
            new UsuarioLookupViewModel { UsuarioID = 6, NombreUsuario = "Carlos Ruiz", CorreoUsuario = "carlos@example.com" }
        });
    }

    [Fact]
    public async Task Index_returns_view_with_ticket_summary_and_detail_focus()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        SetupBoard(backend);
        var controller = CreateController(backend, CreateAdminUser());

        var result = await controller.Index(new TicketBoardFilterViewModel(), ticketId: 1, focus: "detail");

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<TicketBoardPageViewModel>(view.Model);
        Assert.Single(model.Items);
        Assert.NotNull(model.SelectedTicket);
        Assert.Equal(1, model.SelectedTicket!.TicketID);
        Assert.Equal(1, model.TotalTickets);
        Assert.Equal(1, model.TotalEnSeguimiento);
        Assert.True(model.FocusDetail);
    }

    [Fact]
    public async Task Guardar_valid_ticket_redirects_to_detail_with_message()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        TicketBoardItemViewModel? saved = null;
        backend.Setup(service => service.SaveTicketAsync(It.IsAny<TicketBoardItemViewModel>()))
            .Callback<TicketBoardItemViewModel>(item => saved = item)
            .ReturnsAsync(15);

        var controller = CreateController(backend, CreateAdminUser());

        var result = await controller.Guardar(
            new TicketBoardItemViewModel
            {
                TituloTicket = "Fuga en jardín",
                DescripcionTicket = "Se detectó fuga junto al jardín central.",
                UsuarioSolicitanteID = 5,
                PrioridadTicketID = 1,
                EstadoTicketID = 1,
                FechaCreacionTicket = default
            },
            new TicketBoardFilterViewModel { SoloAbiertos = true },
            newTicket: true,
            focus: null);

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal(15, redirect.RouteValues!["ticketId"]);
        Assert.Equal("detail", redirect.RouteValues["focus"]);
        Assert.Equal(true, redirect.RouteValues["soloAbiertos"]);
        Assert.Equal("Ticket creado.", controller.TempData["TicketMessage"]);
        Assert.NotNull(saved);
        Assert.NotEqual(default, saved!.FechaCreacionTicket);
    }
}