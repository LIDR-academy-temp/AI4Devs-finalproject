using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Moq;
using System.Security.Claims;
using Web.Models.Admin;
using Web.Models.Residente;
using Web.Services;
using Xunit;
using ResidentCalendarioController = Web.Controllers.Residente.CalendarioController;

namespace Web.Tests;

public sealed class ResidentCalendarControllerTests
{
    private static ClaimsPrincipal CreateUser(int usuarioId = 25, bool isAdmin = false)
    {
        var claims = new List<Claim>
        {
            new(CotoContext.UsuarioIdClaim, usuarioId.ToString()),
            new(CotoContext.EsAdminClaim, isAdmin ? "true" : "false"),
            new(ClaimTypes.Name, "juan@test.com")
        };

        return new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"));
    }

    private static ResidentPortalContextViewModel BuildActiveContext(bool activeProperty = true)
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
            SelectedCondominioId = activeProperty ? 1 : null,
            SelectedCondominioName = activeProperty ? "Cuarta Quinientos" : string.Empty,
            SelectedCasaId = activeProperty ? 8 : null,
            SelectedCasaLabel = activeProperty ? "Casa 8" : null,
            RequiresPropertySelection = !activeProperty,
            StatusMessage = activeProperty ? null : "Selecciona una vivienda"
        };
    }

    private static ResidentCalendarioController CreateController(
        Mock<IGraphApiBackendService> backend,
        Mock<IResidentPortalService> residentPortal,
        bool activeProperty = true)
    {
        residentPortal.Setup(service => service.GetContextAsync(It.IsAny<ClaimsPrincipal>()))
            .ReturnsAsync(BuildActiveContext(activeProperty));

        var controller = new ResidentCalendarioController(backend.Object, residentPortal.Object);
        var httpContext = new DefaultHttpContext
        {
            User = CreateUser()
        };

        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
        controller.TempData = new TempDataDictionary(httpContext, Mock.Of<ITempDataProvider>());
        return controller;
    }

    [Fact]
    public async Task Index_returns_only_resident_reservations_and_configures_resident_shell()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        backend.Setup(service => service.GetReservasAmenidadesAsync()).ReturnsAsync(new[]
        {
            new ReservaAmenidadFormViewModel { ReservacionAreaID = 1, AreasComunesID = 3, AreasComunes = "Palapa", UsuarioID = 25, NombreUsuario = "Juan", FechaInicio = DateTime.Now.AddDays(1), FechaFin = DateTime.Now.AddDays(1).AddHours(2), ReservacionEstadoID = 1, ReservacionEstado = "Pendiente", bEliminado = false },
            new ReservaAmenidadFormViewModel { ReservacionAreaID = 2, AreasComunesID = 3, AreasComunes = "Palapa", UsuarioID = 44, NombreUsuario = "Otro", FechaInicio = DateTime.Now.AddDays(2), FechaFin = DateTime.Now.AddDays(2).AddHours(2), ReservacionEstadoID = 1, ReservacionEstado = "Pendiente", bEliminado = false }
        });
        backend.Setup(service => service.GetJuntasAsync()).ReturnsAsync(new[]
        {
            new JuntaFormViewModel { JuntaID = 10, Titulo = "Asamblea mensual", FechaProgramada = DateTime.Now.AddDays(3), Ubicacion = "Salón", bActivo = true, bEliminado = false },
            new JuntaFormViewModel { JuntaID = 11, Titulo = "Cancelada", FechaProgramada = DateTime.Now.AddDays(4), Ubicacion = "Salón", bActivo = false, bEliminado = true }
        });

        var residentPortal = new Mock<IResidentPortalService>(MockBehavior.Loose);
        var controller = CreateController(backend, residentPortal);

        var result = await controller.Index();

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<CalendarioViewModel>(view.Model);
        Assert.Single(model.Reservas);
        Assert.Equal(1, model.Reservas[0].ReservacionAreaID);
        Assert.Single(model.Juntas);
        Assert.Equal("Mi calendario", model.PageTitle);
        Assert.Equal("/Residente/Inicio", model.HomeHref);
    }

    [Fact]
    public async Task Index_redirects_to_acceso_when_property_selection_is_required()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        var residentPortal = new Mock<IResidentPortalService>(MockBehavior.Loose);
        var controller = CreateController(backend, residentPortal, activeProperty: false);

        var result = await controller.Index();

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal("Acceso", redirect.ControllerName);
    }

    [Fact]
    public async Task Index_redirects_admin_users_back_to_home()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        var residentPortal = new Mock<IResidentPortalService>(MockBehavior.Loose);
        residentPortal.Setup(service => service.GetContextAsync(It.IsAny<ClaimsPrincipal>()))
            .ReturnsAsync(new ResidentPortalContextViewModel
            {
                UsuarioId = 25,
                IsAdministrador = true,
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
            });

        var controller = new ResidentCalendarioController(backend.Object, residentPortal.Object);
        var httpContext = new DefaultHttpContext
        {
            User = CreateUser(isAdmin: true)
        };

        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
        controller.TempData = new TempDataDictionary(httpContext, Mock.Of<ITempDataProvider>());

        var result = await controller.Index();

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal("Home", redirect.ControllerName);
    }
}