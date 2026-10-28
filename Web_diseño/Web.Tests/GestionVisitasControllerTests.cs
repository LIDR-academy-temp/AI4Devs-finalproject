using Microsoft.AspNetCore.Hosting;
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

public sealed class GestionVisitasControllerTests
{
    private static VisitasController CreateController(Mock<IGraphApiBackendService> backend, ClaimsPrincipal? user = null)
    {
        var env = new Mock<IWebHostEnvironment>(MockBehavior.Loose);
        env.SetupGet(item => item.WebRootPath).Returns(Path.GetTempPath());

        var controller = new VisitasController(backend.Object, env.Object);
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
        backend.Setup(service => service.GetCasasAsync()).ReturnsAsync(new[]
        {
            new CasaFormViewModel { CasaID = 8, CondominioID = 1, NombreCondominio = "Cuarta Quinientos", DireccionCasa = "Amapolas", NumeroExtCasa = "8", NombrePropietario = "Ana López" }
        });
        backend.Setup(service => service.GetUsuariosAsync()).ReturnsAsync(new[]
        {
            new UsuarioLookupViewModel { UsuarioID = 5, NombreUsuario = "Ana López", CorreoUsuario = "ana@example.com" }
        });
        backend.Setup(service => service.GetTipoIdentificacionesAsync()).ReturnsAsync(new[]
        {
            new TipoIdentificacionLookupViewModel { TipoIdentificacionID = 2, TipoIdentificacion = "INE" }
        });
    }

    [Fact]
    public async Task Index_returns_view_with_visit_filters_and_upcoming_items()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        SetupLookups(backend);
        backend.Setup(service => service.GetVisitasAsync()).ReturnsAsync(new[]
        {
            new VisitaFormViewModel
            {
                VisitaID = 1,
                VisitanteNombre = "Invitado Uno",
                UsuarioVisitadoID = 5,
                CasaID = 8,
                TipoIdentificacionID = 2,
                NumeroIdentificacion = "ABC123",
                FechaEntrada = DateTime.Now.AddHours(2),
                FechaSalida = DateTime.Now.AddHours(4),
                Autorizado = true
            },
            new VisitaFormViewModel
            {
                VisitaID = 2,
                VisitanteNombre = "Invitado Viejo",
                UsuarioVisitadoID = 5,
                CasaID = 8,
                TipoIdentificacionID = 2,
                NumeroIdentificacion = "XYZ999",
                FechaEntrada = DateTime.Now.AddDays(-2),
                FechaSalida = DateTime.Now.AddDays(-2).AddHours(1),
                Autorizado = true
            }
        });
        var controller = CreateController(backend, CreateAdminUser());

        var result = await controller.Index(editId: 1, soloProximas: true);

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<VisitasPageViewModel>(view.Model);
        Assert.Single(model.Items);
        Assert.Equal(1, model.Form.VisitaID);
        Assert.Equal("Programada", model.Items[0].EstadoTemporal);
        Assert.Single(model.CasaOptions);
        Assert.Single(model.UsuarioOptions);
    }

    [Fact]
    public async Task Save_valid_model_calls_backend_and_redirects()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        backend.Setup(service => service.SaveVisitaAsync(It.IsAny<VisitaFormViewModel>())).ReturnsAsync(true);
        var controller = CreateController(backend, CreateAdminUser());

        var result = await controller.Save(new VisitaFormViewModel
        {
            VisitanteNombre = "Invitado Uno",
            UsuarioVisitadoID = 5,
            CasaID = 8,
            TipoIdentificacionID = 2,
            NumeroIdentificacion = "ABC123",
            FechaEntrada = DateTime.Now.AddHours(2),
            FechaSalida = DateTime.Now.AddHours(4),
            Autorizado = true
        });

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal("Visita creada.", controller.TempData["Message"]);
        backend.Verify(service => service.SaveVisitaAsync(It.Is<VisitaFormViewModel>(item =>
            item.VisitanteNombre == "Invitado Uno" && item.UsuarioVisitadoID == 5 && item.CasaID == 8)), Times.Once);
    }

    [Fact]
    public async Task Delete_valid_id_calls_backend_and_redirects()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        backend.Setup(service => service.DeleteVisitaAsync(1)).ReturnsAsync(true);
        var controller = CreateController(backend, CreateAdminUser());

        var result = await controller.Delete(1);

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal("Visita eliminada.", controller.TempData["Message"]);
        backend.Verify(service => service.DeleteVisitaAsync(1), Times.Once);
    }
}