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

public sealed class UsuariosAdminControllerTests
{
    private static UsuariosAdminController CreateController(
        Mock<IGraphApiBackendService> backend,
        Mock<IPermissionService> permissions,
        ClaimsPrincipal? user = null)
    {
        var controller = new UsuariosAdminController(backend.Object, permissions.Object);
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

    private static IReadOnlyList<SgrUsuarioFormViewModel> SampleUsuarios()
        => new List<SgrUsuarioFormViewModel>
        {
            new()
            {
                UsuarioID = 5,
                Nombre = "Ana López",
                Correo = "ana@example.com",
                PerfilID = 2,
                bActivo = true
            }
        };

    private static IReadOnlyList<SgrPerfilFormViewModel> SamplePerfiles()
        => new List<SgrPerfilFormViewModel>
        {
            new()
            {
                PerfilID = 2,
                Perfil = "Administrador"
            }
        };

    [Fact]
    public async Task Index_returns_view_with_users_profiles_and_form_for_smoke()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        var permissions = new Mock<IPermissionService>(MockBehavior.Strict);
        backend.Setup(service => service.GetSgrUsuariosAsync()).ReturnsAsync(SampleUsuarios());
        backend.Setup(service => service.GetSgrPerfilesAsync()).ReturnsAsync(SamplePerfiles());
        var controller = CreateController(backend, permissions, CreateAdminUser());

        var result = await controller.Index(editId: 5);

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<SgrUsuariosPageViewModel>(view.Model);
        Assert.Single(model.Items);
        Assert.Single(model.Perfiles);
        Assert.Equal(5, model.Form.UsuarioID);
        Assert.Equal("Ana López", model.Form.Nombre);
        backend.Verify(service => service.GetSgrUsuariosAsync(), Times.Once);
        backend.Verify(service => service.GetSgrPerfilesAsync(), Times.Once);
    }

    [Fact]
    public async Task Save_trims_email_invalidates_cache_and_redirects()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        var permissions = new Mock<IPermissionService>(MockBehavior.Strict);
        backend.Setup(service => service.CheckEmailExistsAsync("ana@example.com", 5)).ReturnsAsync(false);
        backend.Setup(service => service.SaveSgrUsuarioAsync(It.IsAny<SgrUsuarioFormViewModel>())).ReturnsAsync(true);
        permissions.Setup(service => service.InvalidateCache(2));
        var controller = CreateController(backend, permissions, CreateAdminUser());

        var result = await controller.Save(new SgrUsuarioFormViewModel
        {
            UsuarioID = 5,
            Nombre = "Ana López",
            Correo = "  ana@example.com  ",
            PerfilID = 2,
            bActivo = true
        });

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal("Usuario actualizado.", controller.TempData["Message"]);
        backend.Verify(service => service.SaveSgrUsuarioAsync(It.Is<SgrUsuarioFormViewModel>(item =>
            item.UsuarioID == 5 && item.Correo == "ana@example.com" && item.PerfilID == 2)), Times.Once);
        permissions.Verify(service => service.InvalidateCache(2), Times.Once);
    }

    [Fact]
    public async Task Save_rejects_duplicate_email_and_keeps_edit_id()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        var permissions = new Mock<IPermissionService>(MockBehavior.Strict);
        backend.Setup(service => service.CheckEmailExistsAsync("ana@example.com", 5)).ReturnsAsync(true);
        var controller = CreateController(backend, permissions, CreateAdminUser());

        var result = await controller.Save(new SgrUsuarioFormViewModel
        {
            UsuarioID = 5,
            Nombre = "Ana López",
            Correo = "ana@example.com",
            PerfilID = 2,
            bActivo = true
        });

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal(5, redirect.RouteValues!["editId"]);
        Assert.Equal("El correo electrónico ya está en uso por otro usuario.", controller.TempData["Error"]);
        backend.Verify(service => service.SaveSgrUsuarioAsync(It.IsAny<SgrUsuarioFormViewModel>()), Times.Never);
        permissions.Verify(service => service.InvalidateCache(It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task Save_rejects_invalid_model_without_backend_calls()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        var permissions = new Mock<IPermissionService>(MockBehavior.Strict);
        var controller = CreateController(backend, permissions, CreateAdminUser());
        controller.ModelState.AddModelError("Nombre", "Required");

        var result = await controller.Save(new SgrUsuarioFormViewModel());

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal("Datos inválidos.", controller.TempData["Error"]);
        backend.Verify(service => service.CheckEmailExistsAsync(It.IsAny<string>(), It.IsAny<int?>()), Times.Never);
        backend.Verify(service => service.SaveSgrUsuarioAsync(It.IsAny<SgrUsuarioFormViewModel>()), Times.Never);
    }
}