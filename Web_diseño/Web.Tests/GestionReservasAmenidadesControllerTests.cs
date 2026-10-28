using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Moq;
using System.Security.Claims;
using Web.Controllers.Catalogos;
using Web.Models.Admin;
using Web.Services;
using Xunit;

namespace Web.Tests;

public sealed class GestionReservasAmenidadesControllerTests
{
    private static ReservasAmenidadesController CreateController(Mock<IGraphApiBackendService> backend, ClaimsPrincipal? user = null)
    {
        var controller = new ReservasAmenidadesController(backend.Object);
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

    private static void SetupLookups(Mock<IGraphApiBackendService> backend)
    {
        backend.Setup(service => service.GetAreasComunesAsync()).ReturnsAsync(new[]
        {
            new AreaComunFormViewModel { AreasComunesID = 3, AreasComunes = "Palapa", Capacidad = 30, RequiereReservacion = true, bEliminado = false }
        });
        backend.Setup(service => service.GetUsuariosAsync()).ReturnsAsync(new[]
        {
            new UsuarioLookupViewModel { UsuarioID = 5, NombreUsuario = "Ana López", CorreoUsuario = "ana@example.com", bActivoUsuario = true, bEliminado = false }
        });
        backend.Setup(service => service.GetReservacionEstadosAsync()).ReturnsAsync(new[]
        {
            new ReservacionEstadoLookupViewModel { ReservacionEstadoID = 1, ReservacionEstado = "Pendiente", bEliminado = false },
            new ReservacionEstadoLookupViewModel { ReservacionEstadoID = 2, ReservacionEstado = "Confirmada", bEliminado = false }
        });
    }

    [Fact]
    public async Task Index_returns_view_with_reservations_and_lookup_options()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        SetupLookups(backend);
        backend.Setup(service => service.GetReservasAmenidadesAsync()).ReturnsAsync(new[]
        {
            new ReservaAmenidadFormViewModel
            {
                ReservacionAreaID = 1,
                AreasComunesID = 3,
                UsuarioID = 5,
                FechaInicio = DateTime.Now.AddDays(1),
                FechaFin = DateTime.Now.AddDays(1).AddHours(2),
                ReservacionEstadoID = 1,
                bEliminado = false
            }
        });
        var controller = CreateController(backend, CreateAdminUser());

        var result = await controller.Index(editId: 1, filtroAreaId: 3, soloActivas: true);

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<ReservaAmenidadPageViewModel>(view.Model);
        Assert.Single(model.Items);
        Assert.Equal(1, model.Form.ReservacionAreaID);
        Assert.True(model.PuedeGuardar);
        Assert.Equal(1, model.TotalAmenidades);
        Assert.Equal(2, model.TotalEstados);
        Assert.Single(model.AreasOptions);
        Assert.Equal(3, model.FiltroAreaId);
    }

    [Fact]
    public async Task Save_valid_model_returns_success_view_and_calls_backend()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        SetupLookups(backend);
        backend.Setup(service => service.GetReservasAmenidadesAsync()).ReturnsAsync(Array.Empty<ReservaAmenidadFormViewModel>());
        backend.Setup(service => service.SaveReservaAmenidadAsync(It.IsAny<ReservaAmenidadFormViewModel>())).ReturnsAsync(true);
        var controller = CreateController(backend, CreateAdminUser());

        var result = await controller.Save(new ReservaAmenidadFormViewModel
        {
            AreasComunesID = 3,
            UsuarioID = 5,
            FechaInicio = DateTime.Now.AddDays(1),
            FechaFin = DateTime.Now.AddDays(1).AddHours(3),
            ReservacionEstadoID = 1
        });

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<ReservaAmenidadPageViewModel>(view.Model);
        Assert.Equal("Reserva de amenidad creada.", model.Message);
        backend.Verify(service => service.SaveReservaAmenidadAsync(It.Is<ReservaAmenidadFormViewModel>(item =>
            item.AreasComunesID == 3 && item.UsuarioID == 5 && item.ReservacionEstadoID == 1)), Times.Once);
    }

    [Fact]
    public async Task Delete_valid_id_calls_backend_and_redirects()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        backend.Setup(service => service.DeleteReservaAmenidadAsync(1)).ReturnsAsync(true);
        var controller = CreateController(backend, CreateAdminUser());

        var result = await controller.Delete(1);

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal("Reserva eliminada.", controller.TempData["Message"]);
        backend.Verify(service => service.DeleteReservaAmenidadAsync(1), Times.Once);
    }
}