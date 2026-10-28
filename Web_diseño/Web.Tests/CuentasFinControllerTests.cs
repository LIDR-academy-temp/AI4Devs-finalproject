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

public sealed class CuentasFinControllerTests
{
    private static CuentasFinController CreateController(Mock<IGraphApiBackendService> backend, ClaimsPrincipal? user = null)
    {
        var controller = new CuentasFinController(backend.Object);
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
    public async Task Index_returns_view_with_accounts_and_responsable_options()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        backend.Setup(service => service.GetCuentasAsync()).ReturnsAsync(new[]
        {
            new CuentaFormViewModel { CuentaID = 7, Cuenta = "Caja general", Tipo = "Caja", ResponsableUsuarioID = 2, bEliminado = false },
            new CuentaFormViewModel { CuentaID = 8, Cuenta = "Archivo", Tipo = "Histórica", ResponsableUsuarioID = 3, bEliminado = true }
        });
        backend.Setup(service => service.GetUsuariosAsync()).ReturnsAsync(new[]
        {
            new UsuarioLookupViewModel { UsuarioID = 2, NombreUsuario = "Ana López", CorreoUsuario = "ana@example.com" },
            new UsuarioLookupViewModel { UsuarioID = 3, NombreUsuario = "Carlos Ruiz", CorreoUsuario = "carlos@example.com" }
        });
        var controller = CreateController(backend, CreateAdminUser());

        var result = await controller.Index(editId: 7, soloActivas: true);

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<CuentasPageViewModel>(view.Model);
        Assert.Single(model.Items);
        Assert.Equal(7, model.Form.CuentaID);
        Assert.Equal("Ana López", model.Items[0].NombreResponsable);
        Assert.Equal(1, model.TotalActivas);
        Assert.Equal(3, model.ResponsableOptions.Count);
    }

    [Fact]
    public async Task Save_valid_model_calls_backend_and_redirects()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        backend.Setup(service => service.SaveCuentaAsync(It.IsAny<CuentaFormViewModel>())).ReturnsAsync(true);
        var controller = CreateController(backend, CreateAdminUser());

        var result = await controller.Save(new CuentaFormViewModel
        {
            Cuenta = "Fondo emergencias",
            Tipo = "Ahorro",
            Saldo = 1500m,
            ResponsableUsuarioID = 2
        });

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal("Cuenta creada.", controller.TempData["Message"]);
        backend.Verify(service => service.SaveCuentaAsync(It.Is<CuentaFormViewModel>(item =>
            item.Cuenta == "Fondo emergencias" && item.Tipo == "Ahorro" && item.ResponsableUsuarioID == 2)), Times.Once);
    }

    [Fact]
    public async Task Delete_valid_id_calls_backend_and_redirects()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        backend.Setup(service => service.DeleteCuentaAsync(7)).ReturnsAsync(true);
        var controller = CreateController(backend, CreateAdminUser());

        var result = await controller.Delete(7);

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal("Cuenta eliminada.", controller.TempData["Message"]);
        backend.Verify(service => service.DeleteCuentaAsync(7), Times.Once);
    }
}