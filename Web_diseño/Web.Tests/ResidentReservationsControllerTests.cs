using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Moq;
using System.Security.Claims;
using Web.Models.Admin;
using Web.Models.Residente;
using Web.Services;
using Xunit;
using ResidentReservasController = Web.Controllers.Residente.ReservasController;

namespace Web.Tests;

public sealed class ResidentReservationsControllerTests
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

    private static ResidentReservasController CreateController(
        Mock<IGraphApiBackendService> backend,
        Mock<IResidentPortalService> residentPortal,
        bool activeProperty = true)
    {
        residentPortal.Setup(service => service.GetContextAsync(It.IsAny<ClaimsPrincipal>()))
            .ReturnsAsync(BuildActiveContext(activeProperty));

        var controller = new ResidentReservasController(backend.Object, residentPortal.Object);
        var httpContext = new DefaultHttpContext
        {
            User = CreateUser()
        };

        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
        controller.TempData = new TempDataDictionary(httpContext, Mock.Of<ITempDataProvider>());
        return controller;
    }

    private static void SetupReservationLookups(Mock<IGraphApiBackendService> backend)
    {
        backend.Setup(service => service.GetAreasComunesAsync()).ReturnsAsync(new[]
        {
            new AreaComunFormViewModel { AreasComunesID = 3, AreasComunes = "Palapa", Capacidad = 20, RequiereReservacion = true, bEliminado = false }
        });
        backend.Setup(service => service.GetReservacionEstadosAsync()).ReturnsAsync(new[]
        {
            new ReservacionEstadoLookupViewModel { ReservacionEstadoID = 1, ReservacionEstado = "Pendiente", bEliminado = false },
            new ReservacionEstadoLookupViewModel { ReservacionEstadoID = 2, ReservacionEstado = "Cancelada", bEliminado = false }
        });
    }

    [Fact]
    public async Task Index_returns_only_reservations_for_current_resident()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        SetupReservationLookups(backend);
        backend.Setup(service => service.GetReservasAmenidadesAsync()).ReturnsAsync(new[]
        {
            new ReservaAmenidadFormViewModel { ReservacionAreaID = 1, AreasComunesID = 3, AreasComunes = "Palapa", UsuarioID = 25, NombreUsuario = "Juan", FechaInicio = DateTime.Now.AddDays(1), FechaFin = DateTime.Now.AddDays(1).AddHours(2), ReservacionEstadoID = 1, ReservacionEstado = "Pendiente", bEliminado = false },
            new ReservaAmenidadFormViewModel { ReservacionAreaID = 2, AreasComunesID = 3, AreasComunes = "Palapa", UsuarioID = 44, NombreUsuario = "Otro", FechaInicio = DateTime.Now.AddDays(2), FechaFin = DateTime.Now.AddDays(2).AddHours(2), ReservacionEstadoID = 1, ReservacionEstado = "Pendiente", bEliminado = false }
        });

        var residentPortal = new Mock<IResidentPortalService>(MockBehavior.Loose);
        var controller = CreateController(backend, residentPortal);

        var result = await controller.Index();

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<ResidentReservationPageViewModel>(view.Model);
        Assert.Single(model.Items);
        Assert.Equal(1, model.Items[0].ReservacionAreaID);
        Assert.Equal(1, model.TotalReservas);
    }

    [Fact]
    public async Task Guardar_forces_current_user_when_creating_reservation()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        SetupReservationLookups(backend);
        backend.Setup(service => service.GetReservasAmenidadesAsync()).ReturnsAsync(Array.Empty<ReservaAmenidadFormViewModel>());

        ReservaAmenidadFormViewModel? saved = null;
        backend.Setup(service => service.SaveReservaAmenidadAsync(It.IsAny<ReservaAmenidadFormViewModel>()))
            .Callback<ReservaAmenidadFormViewModel>(item => saved = item)
            .ReturnsAsync(true);

        var residentPortal = new Mock<IResidentPortalService>(MockBehavior.Loose);
        var controller = CreateController(backend, residentPortal);

        var result = await controller.Guardar(new ReservaAmenidadFormViewModel
        {
            AreasComunesID = 3,
            UsuarioID = 999,
            FechaInicio = DateTime.Now.AddDays(1),
            FechaFin = DateTime.Now.AddDays(1).AddHours(2),
            ReservacionEstadoID = 1
        });

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.NotNull(saved);
        Assert.Equal(25, saved!.UsuarioID);
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
}