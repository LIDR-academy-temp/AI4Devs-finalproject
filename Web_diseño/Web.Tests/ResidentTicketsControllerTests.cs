using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.AspNetCore.Routing;
using Moq;
using System.Security.Claims;
using Web.Models.Admin;
using Web.Models.Residente;
using Web.Services;
using Xunit;
using ResidentTicketsController = Web.Controllers.Residente.TicketsController;

namespace Web.Tests;

public sealed class ResidentTicketsControllerTests
{
    private static ClaimsPrincipal CreateUser(int usuarioId = 25)
    {
        var claims = new List<Claim>
        {
            new(CotoContext.UsuarioIdClaim, usuarioId.ToString()),
            new(CotoContext.EsAdminClaim, "false")
        };

        return new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"));
    }

    private static ResidentPortalContextViewModel BuildActiveContext()
    {
        return new ResidentPortalContextViewModel
        {
            UsuarioId = 25,
            IsResident = true,
            Properties = new[]
            {
                new ResidentPropertyOptionViewModel
                {
                    CondominioId = 1,
                    CondominioName = "Cuarta Quinientos",
                    CasaId = 8,
                    CasaLabel = "Casa 8"
                }
            },
            SelectedCondominioId = 1,
            SelectedCondominioName = "Cuarta Quinientos",
            SelectedCasaId = 8,
            SelectedCasaLabel = "Casa 8"
        };
    }

    private static ResidentTicketsController CreateController(
        Mock<IGraphApiBackendService> backend,
        Mock<IResidentPortalService> residentPortal)
    {
        residentPortal.Setup(service => service.GetContextAsync(It.IsAny<ClaimsPrincipal>()))
            .ReturnsAsync(BuildActiveContext());

        var env = new Mock<IWebHostEnvironment>(MockBehavior.Loose);
        env.SetupGet(item => item.WebRootPath).Returns(Path.GetTempPath());

        var controller = new ResidentTicketsController(backend.Object, env.Object, residentPortal.Object);
        var httpContext = new DefaultHttpContext
        {
            User = CreateUser()
        };

        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
        controller.TempData = new TempDataDictionary(httpContext, Mock.Of<ITempDataProvider>());
        return controller;
    }

    private static void SetupLookups(Mock<IGraphApiBackendService> backend)
    {
        backend.Setup(service => service.GetEstadosTicketsAsync()).ReturnsAsync(new[]
        {
            new TicketBoardStateLookupViewModel { EstadoTicketID = 1, EstadoTicket = "Nuevo", bEliminado = false },
            new TicketBoardStateLookupViewModel { EstadoTicketID = 2, EstadoTicket = "Resuelto", bEliminado = false }
        });

        backend.Setup(service => service.GetPrioridadTicketsAsync()).ReturnsAsync(new[]
        {
            new TicketBoardPriorityLookupViewModel { PrioridadTicketID = 1, PrioridadTicket = "Alta", bEliminado = false }
        });

        backend.Setup(service => service.GetComentariosTicketsAsync()).ReturnsAsync(Array.Empty<TicketBoardCommentViewModel>());
        backend.Setup(service => service.GetTicketAttachmentsAsync()).ReturnsAsync(Array.Empty<TicketBoardAttachmentViewModel>());
        backend.Setup(service => service.GetUsuariosAsync()).ReturnsAsync(new[]
        {
            new UsuarioLookupViewModel { UsuarioID = 25, NombreUsuario = "Juan Residente", bEliminado = false },
            new UsuarioLookupViewModel { UsuarioID = 44, NombreUsuario = "Ana Vecina", bEliminado = false },
            new UsuarioLookupViewModel { UsuarioID = 55, NombreUsuario = "Soporte", bEliminado = false }
        });
    }

    [Fact]
    public async Task Index_created_tab_returns_only_tickets_created_by_resident()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        SetupLookups(backend);
        backend.Setup(service => service.GetTicketsAsync()).ReturnsAsync(new[]
        {
            new TicketBoardItemViewModel { TicketID = 1, TituloTicket = "Fuga de agua", UsuarioSolicitanteID = 25, NombreSolicitante = "Juan Residente", PrioridadTicketID = 1, EstadoTicketID = 1, EstadoTicket = "Nuevo", FechaCreacionTicket = new DateTime(2026, 4, 20) },
            new TicketBoardItemViewModel { TicketID = 2, TituloTicket = "Elevador", UsuarioSolicitanteID = 44, NombreSolicitante = "Ana Vecina", PrioridadTicketID = 1, EstadoTicketID = 1, EstadoTicket = "Nuevo", FechaCreacionTicket = new DateTime(2026, 4, 21) }
        });
        backend.Setup(service => service.GetTicketsUsuariosAsignadosAsync()).ReturnsAsync(Array.Empty<TicketBoardAssignmentViewModel>());

        var residentPortal = new Mock<IResidentPortalService>(MockBehavior.Loose);
        var controller = CreateController(backend, residentPortal);

        var result = await controller.Index(new TicketBoardFilterViewModel(), tab: "created");

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<TicketBoardPageViewModel>(view.Model);
        Assert.Single(model.Items);
        Assert.Equal(1, model.Items[0].TicketID);
    }

    [Fact]
    public async Task Index_assigned_tab_returns_only_tickets_assigned_to_resident()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        SetupLookups(backend);
        backend.Setup(service => service.GetTicketsAsync()).ReturnsAsync(new[]
        {
            new TicketBoardItemViewModel { TicketID = 1, TituloTicket = "Portón eléctrico", UsuarioSolicitanteID = 44, NombreSolicitante = "Ana Vecina", PrioridadTicketID = 1, EstadoTicketID = 1, EstadoTicket = "Nuevo", FechaCreacionTicket = new DateTime(2026, 4, 20) },
            new TicketBoardItemViewModel { TicketID = 2, TituloTicket = "Lámpara fundida", UsuarioSolicitanteID = 25, NombreSolicitante = "Juan Residente", PrioridadTicketID = 1, EstadoTicketID = 1, EstadoTicket = "Nuevo", FechaCreacionTicket = new DateTime(2026, 4, 21) }
        });
        backend.Setup(service => service.GetTicketsUsuariosAsignadosAsync()).ReturnsAsync(new[]
        {
            new TicketBoardAssignmentViewModel { TicketsUsuariosAsignadosID = 9, TicketID = 1, UsuarioID = 25, UsuarioAsignado = "Juan Residente", Terminado = false, bEliminado = false },
            new TicketBoardAssignmentViewModel { TicketsUsuariosAsignadosID = 10, TicketID = 2, UsuarioID = 55, UsuarioAsignado = "Soporte", Terminado = false, bEliminado = false }
        });

        var residentPortal = new Mock<IResidentPortalService>(MockBehavior.Loose);
        var controller = CreateController(backend, residentPortal);

        var result = await controller.Index(new TicketBoardFilterViewModel(), tab: "assigned");

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<TicketBoardPageViewModel>(view.Model);
        Assert.Single(model.Items);
        Assert.Equal(1, model.Items[0].TicketID);
        Assert.Equal(25, model.Items[0].UsuarioAsignadoID);
    }

    [Fact]
    public async Task Guardar_forces_resident_usuario_id_when_creating_ticket()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        TicketBoardItemViewModel? savedModel = null;
        backend.Setup(service => service.SaveTicketAsync(It.IsAny<TicketBoardItemViewModel>()))
            .Callback<TicketBoardItemViewModel>(model => savedModel = model)
            .ReturnsAsync(101);

        var residentPortal = new Mock<IResidentPortalService>(MockBehavior.Loose);
        var controller = CreateController(backend, residentPortal);

        var result = await controller.Guardar(
            new TicketBoardItemViewModel
            {
                TituloTicket = "Fuga de agua",
                DescripcionTicket = "Hay fuga en el jardín.",
                UsuarioSolicitanteID = 999,
                PrioridadTicketID = 1,
                EstadoTicketID = 1
            },
            new TicketBoardFilterViewModel(),
            newTicket: true,
            focus: "detail",
            tab: "created");

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        var routeValues = Assert.IsType<RouteValueDictionary>(redirect.RouteValues);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal(101, routeValues["ticketId"]);
        Assert.Equal("created", routeValues["tab"]);
        Assert.NotNull(savedModel);
        Assert.Equal(25, savedModel!.UsuarioSolicitanteID);
    }

    [Fact]
    public async Task Responder_uses_resident_user_and_redirects_when_ticket_is_accessible()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        SetupLookups(backend);
        backend.Setup(service => service.GetTicketsAsync()).ReturnsAsync(new[]
        {
            new TicketBoardItemViewModel { TicketID = 7, TituloTicket = "Alberca", UsuarioSolicitanteID = 25, NombreSolicitante = "Juan Residente", PrioridadTicketID = 1, EstadoTicketID = 1, EstadoTicket = "Nuevo", FechaCreacionTicket = new DateTime(2026, 4, 20) }
        });
        backend.Setup(service => service.GetTicketsUsuariosAsignadosAsync()).ReturnsAsync(Array.Empty<TicketBoardAssignmentViewModel>());

        TicketBoardReplyViewModel? savedReply = null;
        backend.Setup(service => service.SaveTicketCommentAsync(It.IsAny<TicketBoardReplyViewModel>()))
            .Callback<TicketBoardReplyViewModel>(model => savedReply = model)
            .ReturnsAsync(true);

        var residentPortal = new Mock<IResidentPortalService>(MockBehavior.Loose);
        var controller = CreateController(backend, residentPortal);

        var result = await controller.Responder(
            new TicketBoardReplyViewModel
            {
                TicketID = 7,
                UsuarioID = 999,
                Comentario = "Ya compartí fotos del problema.",
                NuevoEstadoTicketID = 1,
                bEliminado = false
            },
            new TicketBoardFilterViewModel(),
            tab: "created");

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        var routeValues = Assert.IsType<RouteValueDictionary>(redirect.RouteValues);
        Assert.Equal(7, routeValues["ticketId"]);
        Assert.NotNull(savedReply);
        Assert.Equal(25, savedReply!.UsuarioID);
        Assert.Equal("Ya compartí fotos del problema.", savedReply.Comentario);
    }
}