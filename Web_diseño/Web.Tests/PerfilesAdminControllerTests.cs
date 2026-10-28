using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Moq;
using System.Security.Claims;
using Web.Controllers.Admin;
using Web.Models.Admin;
using Web.Services;
using Xunit;

namespace Web.Tests;

public sealed class PerfilesAdminControllerTests
{
    private static PerfilesAdminController CreateController(
        Mock<IGraphApiBackendService> backend,
        Mock<IPermissionService> permissions,
        ClaimsPrincipal? user = null)
    {
        var controller = new PerfilesAdminController(backend.Object, permissions.Object);
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
            new(CotoContext.EsAdminClaim, "true")
        };

        return new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"));
    }

    private static IReadOnlyList<SgrPerfilFormViewModel> SamplePerfiles()
        => new List<SgrPerfilFormViewModel>
        {
            new()
            {
                PerfilID = 3,
                Perfil = "Operación",
                bAdministrador = false
            }
        };

    [Fact]
    public async Task Index_returns_view_with_profiles_for_smoke()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        var permissions = new Mock<IPermissionService>(MockBehavior.Strict);
        backend.Setup(service => service.GetSgrPerfilesAsync()).ReturnsAsync(SamplePerfiles());
        var controller = CreateController(backend, permissions, CreateAdminUser());

        var result = await controller.Index(editId: 3);

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<SgrPerfilesPageViewModel>(view.Model);
        Assert.Single(model.Items);
        Assert.Equal(3, model.Form.PerfilID);
        Assert.Equal("Operación", model.Form.Perfil);
        backend.Verify(service => service.GetSgrPerfilesAsync(), Times.Once);
    }

    [Fact]
    public async Task Save_creates_profile_and_redirects()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        var permissions = new Mock<IPermissionService>(MockBehavior.Strict);
        backend.Setup(service => service.SaveSgrPerfilAsync(It.IsAny<SgrPerfilFormViewModel>())).ReturnsAsync(true);
        var controller = CreateController(backend, permissions, CreateAdminUser());

        var result = await controller.Save(new SgrPerfilFormViewModel
        {
            Perfil = "Cobranza",
            bAdministrador = false
        });

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal("Perfil creado.", controller.TempData["Message"]);
        backend.Verify(service => service.SaveSgrPerfilAsync(It.Is<SgrPerfilFormViewModel>(item =>
            item.Perfil == "Cobranza" && !item.bAdministrador)), Times.Once);
    }

    [Fact]
    public async Task Save_rejects_invalid_model_without_backend_calls()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        var permissions = new Mock<IPermissionService>(MockBehavior.Strict);
        var controller = CreateController(backend, permissions, CreateAdminUser());
        controller.ModelState.AddModelError("Perfil", "Required");

        var result = await controller.Save(new SgrPerfilFormViewModel());

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal("Datos inválidos.", controller.TempData["Error"]);
        backend.Verify(service => service.SaveSgrPerfilAsync(It.IsAny<SgrPerfilFormViewModel>()), Times.Never);
    }

    [Fact]
    public async Task Delete_invalidates_cache_and_redirects()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        var permissions = new Mock<IPermissionService>(MockBehavior.Strict);
        backend.Setup(service => service.DeleteSgrPerfilAsync(3)).ReturnsAsync(true);
        permissions.Setup(service => service.InvalidateCache(3));
        var controller = CreateController(backend, permissions, CreateAdminUser());

        var result = await controller.Delete(3);

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal("Perfil eliminado.", controller.TempData["Message"]);
        backend.Verify(service => service.DeleteSgrPerfilAsync(3), Times.Once);
        permissions.Verify(service => service.InvalidateCache(3), Times.Once);
    }
}