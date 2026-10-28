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

public sealed class PerfilPermisosControllerTests
{
    private static PerfilPermisosController CreateController(
        Mock<IGraphApiBackendService> backend,
        Mock<IPermissionService> permissions,
        ClaimsPrincipal? user = null)
    {
        var controller = new PerfilPermisosController(backend.Object, permissions.Object);
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

    [Fact]
    public async Task Index_loads_selected_profile_permissions_for_smoke()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        var permissions = new Mock<IPermissionService>(MockBehavior.Strict);
        backend.Setup(service => service.GetSgrPerfilesAsync()).ReturnsAsync(new[]
        {
            new SgrPerfilFormViewModel { PerfilID = 4, Perfil = "Tesorería" }
        });
        backend.Setup(service => service.GetPerfilPermisosMenusAsync(4)).ReturnsAsync(new[]
        {
            new PerfilPermisoMenuViewModel { MenuID = 1, TituloMenu = "Cuotas", bVisible = true, Orden = 1 }
        });
        backend.Setup(service => service.GetPerfilPermisosBotonAsync(4)).ReturnsAsync(new[]
        {
            new PerfilPermisoBotonesViewModel { MenuBotonID = 8, MenuID = 1, Boton = "Guardar", Accion = "cuotas.guardar", bActivo = true }
        });
        backend.Setup(service => service.GetSgrMenusAsync()).ReturnsAsync(new[]
        {
            new SgrMenuViewModel { MenuID = 1, TituloMenu = "Cuotas", Orden = 1 },
            new SgrMenuViewModel { MenuID = 2, TituloMenu = "Transacciones", Orden = 2 }
        });
        var controller = CreateController(backend, permissions, CreateAdminUser());

        var result = await controller.Index(perfilId: 4);

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<PerfilPermisosPageViewModel>(view.Model);
        Assert.Equal(4, model.PerfilID);
        Assert.Equal("Tesorería", model.NombrePerfil);
        Assert.Single(model.Menus);
        Assert.Single(model.Botones);
        Assert.Single(model.MenusDisponibles);
        Assert.Equal(2, model.MenusDisponibles[0].MenuID);
    }

    [Fact]
    public async Task SetMenu_updates_permission_invalidates_cache_and_redirects()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        var permissions = new Mock<IPermissionService>(MockBehavior.Strict);
        backend.Setup(service => service.SetPerfilMenuVisibleAsync(4, 12, true)).ReturnsAsync(true);
        permissions.Setup(service => service.InvalidateCache(4));
        var controller = CreateController(backend, permissions, CreateAdminUser());

        var result = await controller.SetMenu(4, 12, true);

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal(4, redirect.RouteValues!["perfilId"]);
        Assert.Equal("Permiso de menú actualizado.", controller.TempData["Message"]);
        backend.Verify(service => service.SetPerfilMenuVisibleAsync(4, 12, true), Times.Once);
        permissions.Verify(service => service.InvalidateCache(4), Times.Once);
    }

    [Fact]
    public async Task AddMenu_adds_permission_invalidates_cache_and_redirects()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        var permissions = new Mock<IPermissionService>(MockBehavior.Strict);
        backend.Setup(service => service.SetPerfilMenuVisibleAsync(4, 7, true)).ReturnsAsync(true);
        permissions.Setup(service => service.InvalidateCache(4));
        var controller = CreateController(backend, permissions, CreateAdminUser());

        var result = await controller.AddMenu(4, 7);

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal("Módulo agregado al perfil.", controller.TempData["Message"]);
        backend.Verify(service => service.SetPerfilMenuVisibleAsync(4, 7, true), Times.Once);
        permissions.Verify(service => service.InvalidateCache(4), Times.Once);
    }

    [Fact]
    public async Task SetBoton_updates_button_permission_invalidates_cache_and_redirects()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        var permissions = new Mock<IPermissionService>(MockBehavior.Strict);
        backend.Setup(service => service.SetPerfilMenuBotonActivoAsync(4, 8, true)).ReturnsAsync(true);
        permissions.Setup(service => service.InvalidateCache(4));
        var controller = CreateController(backend, permissions, CreateAdminUser());

        var result = await controller.SetBoton(4, 8, true);

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal("Permiso de botón actualizado.", controller.TempData["Message"]);
        backend.Verify(service => service.SetPerfilMenuBotonActivoAsync(4, 8, true), Times.Once);
        permissions.Verify(service => service.InvalidateCache(4), Times.Once);
    }
}