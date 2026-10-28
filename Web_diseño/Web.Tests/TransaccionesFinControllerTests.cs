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

public sealed class TransaccionesFinControllerTests
{
    private static TransaccionesFinController CreateController(Mock<IGraphApiBackendService> backend, ClaimsPrincipal? user = null)
    {
        var controller = new TransaccionesFinController(backend.Object);
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
    public async Task Index_returns_view_with_transaction_filters_and_selected_form()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        backend.Setup(service => service.GetTransaccionesAsync()).ReturnsAsync(new[]
        {
            new TransaccionFormViewModel { TransaccionID = 13, CuentaID = 2, UsuarioID = 5, TipoMovimientoID = 1, Cargo = 250m, Motivo = "Cuota enero", bEliminado = false },
            new TransaccionFormViewModel { TransaccionID = 14, CuentaID = 3, UsuarioID = 6, TipoMovimientoID = 2, Abono = 100m, Motivo = "Ajuste", bEliminado = true }
        });
        backend.Setup(service => service.GetCuentasAsync()).ReturnsAsync(new[]
        {
            new CuentaFormViewModel { CuentaID = 2, Cuenta = "Caja general", Tipo = "Caja", bEliminado = false },
            new CuentaFormViewModel { CuentaID = 3, Cuenta = "Cuenta vieja", Tipo = "Archivo", bEliminado = true }
        });
        backend.Setup(service => service.GetUsuariosAsync()).ReturnsAsync(new[]
        {
            new UsuarioLookupViewModel { UsuarioID = 5, NombreUsuario = "Ana López", CorreoUsuario = "ana@example.com" }
        });
        backend.Setup(service => service.GetTiposMovimientoAsync()).ReturnsAsync(new[]
        {
            new TipoMovimientoLookupViewModel { TipoMovimientoID = 1, TipoMovimiento = "Cargo" },
            new TipoMovimientoLookupViewModel { TipoMovimientoID = 2, TipoMovimiento = "Abono" }
        });
        var controller = CreateController(backend, CreateAdminUser());

        var result = await controller.Index(editId: 13, soloActivas: true, filtroCuentaId: 2);

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<TransaccionesPageViewModel>(view.Model);
        Assert.Single(model.Items);
        Assert.Equal(13, model.Form.TransaccionID);
        Assert.Equal(1, model.TotalActivas);
        Assert.Single(model.CuentaOptions);
        Assert.Equal(2, model.TipoMovimientoOptions.Count);
        Assert.Equal(2, model.FiltroCuentaId);
    }

    [Fact]
    public async Task Save_valid_model_calls_backend_and_redirects()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        backend.Setup(service => service.SaveTransaccionAsync(It.IsAny<TransaccionFormViewModel>())).ReturnsAsync(true);
        var controller = CreateController(backend, CreateAdminUser());

        var result = await controller.Save(new TransaccionFormViewModel
        {
            CuentaID = 2,
            UsuarioID = 5,
            TipoMovimientoID = 1,
            Cargo = 350m,
            Motivo = "Cargo extraordinario"
        });

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal("Transacción creada.", controller.TempData["Message"]);
        backend.Verify(service => service.SaveTransaccionAsync(It.Is<TransaccionFormViewModel>(item =>
            item.CuentaID == 2 && item.UsuarioID == 5 && item.TipoMovimientoID == 1 && item.Cargo == 350m)), Times.Once);
    }

    [Fact]
    public async Task Delete_valid_id_calls_backend_and_redirects()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        backend.Setup(service => service.DeleteTransaccionAsync(13)).ReturnsAsync(true);
        var controller = CreateController(backend, CreateAdminUser());

        var result = await controller.Delete(13);

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal("Transacción eliminada.", controller.TempData["Message"]);
        backend.Verify(service => service.DeleteTransaccionAsync(13), Times.Once);
    }
}