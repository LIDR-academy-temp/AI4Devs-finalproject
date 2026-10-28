using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Moq;
using System.Security.Claims;
using Web.Controllers.Finanzas;
using Web.Models.Admin;
using Web.Services;
using Xunit;

namespace Web.Tests;

public sealed class CuotasFinControllerTests
{
    private static CuotasFinController CreateController(Mock<IGraphApiBackendService> backend, ClaimsPrincipal? user = null)
    {
        var controller = new CuotasFinController(backend.Object);
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

    [Fact]
    public async Task Index_returns_view_with_quota_stats_and_display_data()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        backend.Setup(service => service.GetCuotasAsync()).ReturnsAsync(new[]
        {
            new CuotaFormViewModel
            {
                CuotaID = 11,
                UsuarioID = 2,
                CasaID = 8,
                Monto = 950m,
                PeriodoInicio = DateTime.Today.AddDays(-30),
                PeriodoFin = DateTime.Today.AddDays(-1),
                FechaVencimiento = DateTime.Today.AddDays(-3),
                Pagado = false,
                bEliminado = false
            },
            new CuotaFormViewModel
            {
                CuotaID = 12,
                UsuarioID = 3,
                CasaID = 9,
                Monto = 1200m,
                PeriodoInicio = DateTime.Today,
                PeriodoFin = DateTime.Today.AddDays(30),
                FechaVencimiento = DateTime.Today.AddDays(10),
                Pagado = true,
                FechaPago = DateTime.Today,
                bEliminado = false
            }
        });
        backend.Setup(service => service.GetCasasAsync()).ReturnsAsync(new[]
        {
            new CasaFormViewModel { CasaID = 8, CondominioID = 1, NombreCondominio = "Cuarta Quinientos", DireccionCasa = "Amapolas", NumeroExtCasa = "8" },
            new CasaFormViewModel { CasaID = 9, CondominioID = 1, NombreCondominio = "Cuarta Quinientos", DireccionCasa = "Cedros", NumeroExtCasa = "9" }
        });
        backend.Setup(service => service.GetCondominiosAsync()).ReturnsAsync(new[]
        {
            new CondominioFormViewModel { CondominioID = 1, NombreCondominio = "Cuarta Quinientos", DireccionCondominio = "Dirección", bEliminado = false }
        });
        backend.Setup(service => service.GetUsuariosAsync()).ReturnsAsync(new[]
        {
            new UsuarioLookupViewModel { UsuarioID = 2, NombreUsuario = "Ana López", CorreoUsuario = "ana@example.com" },
            new UsuarioLookupViewModel { UsuarioID = 3, NombreUsuario = "Carlos Ruiz", CorreoUsuario = "carlos@example.com" }
        });
        var controller = CreateController(backend, CreateAdminUser());

        var result = await controller.Index(editId: 11);

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<CuotasPageViewModel>(view.Model);
        Assert.Equal(2, model.Items.Count);
        Assert.Equal(11, model.Form.CuotaID);
        Assert.Equal(1, model.TotalPendientes);
        Assert.Equal(1, model.TotalVencidas);
        Assert.Equal("Ana López", model.Items[0].NombrePropietario);
        Assert.Equal("Vencida", model.Items[0].EstadoCuota);
        Assert.Equal(3, model.CasaOptions.Count);
    }

    [Fact]
    public async Task Save_valid_model_calls_backend_and_redirects()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        backend.Setup(service => service.SaveCuotaAsync(It.IsAny<CuotaFormViewModel>())).ReturnsAsync(true);
        var controller = CreateController(backend, CreateAdminUser());

        var result = await controller.Save(new CuotaFormViewModel
        {
            UsuarioID = 2,
            CasaID = 8,
            Monto = 1000m,
            PeriodoInicio = DateTime.Today,
            PeriodoFin = DateTime.Today.AddDays(30),
            FechaVencimiento = DateTime.Today.AddDays(15)
        });

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal("Cuota creada.", controller.TempData["Message"]);
        backend.Verify(service => service.SaveCuotaAsync(It.Is<CuotaFormViewModel>(item =>
            item.UsuarioID == 2 && item.CasaID == 8 && item.Monto == 1000m)), Times.Once);
    }

    [Fact]
    public async Task Delete_valid_id_calls_backend_and_redirects()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        backend.Setup(service => service.DeleteCuotaAsync(11)).ReturnsAsync(true);
        var controller = CreateController(backend, CreateAdminUser());

        var result = await controller.Delete(11);

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal("Cuota eliminada.", controller.TempData["Message"]);
        backend.Verify(service => service.DeleteCuotaAsync(11), Times.Once);
    }
}