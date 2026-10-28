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

public sealed class MenusAdminControllerTests
{
    private static MenusAdminController CreateController(Mock<IGraphApiBackendService> backend, ClaimsPrincipal? user = null)
    {
        var controller = new MenusAdminController(backend.Object);
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

    private static IReadOnlyList<SgrMenuAdminViewModel> SampleMenus()
        => new List<SgrMenuAdminViewModel>
        {
            new()
            {
                MenuID = 1,
                TituloMenu = "Panel general",
                Ruta = "Admin/Dashboard",
                Orden = 1
            },
            new()
            {
                MenuID = 2,
                TituloMenu = "Usuarios",
                Ruta = "Admin/Usuarios",
                Orden = 2
            }
        };

    [Fact]
    public async Task Index_returns_view_with_items_for_admin_smoke()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        backend.Setup(service => service.GetSgrMenusAdminAsync()).ReturnsAsync(SampleMenus());
        var controller = CreateController(backend, CreateAdminUser());

        var result = await controller.Index();

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<SgrMenusAdminPageViewModel>(view.Model);
        Assert.Equal(2, model.Items.Count);
        Assert.Equal("Panel general", model.Items[0].TituloMenu);
        Assert.Equal("", model.Form.TituloMenu);
        backend.Verify(service => service.GetSgrMenusAdminAsync(), Times.Once);
    }

    [Fact]
    public async Task Index_uses_existing_item_when_edit_id_is_provided()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        backend.Setup(service => service.GetSgrMenusAdminAsync()).ReturnsAsync(SampleMenus());
        var controller = CreateController(backend, CreateAdminUser());

        var result = await controller.Index(editId: 2);

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<SgrMenusAdminPageViewModel>(view.Model);
        Assert.Equal(2, model.Form.MenuID);
        Assert.Equal("Usuarios", model.Form.TituloMenu);
    }

    [Fact]
    public async Task Save_calls_service_and_redirects_for_valid_form()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        backend.Setup(service => service.SaveSgrMenuAsync(It.IsAny<SgrMenuAdminViewModel>())).ReturnsAsync(true);
        var controller = CreateController(backend, CreateAdminUser());

        var result = await controller.Save(new SgrMenuAdminViewModel
        {
            TituloMenu = "Nuevo menú",
            Ruta = "Admin/Nuevo",
            Orden = 5
        });

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal("Menú creado.", controller.TempData["Message"]);
        backend.Verify(service => service.SaveSgrMenuAsync(It.Is<SgrMenuAdminViewModel>(item =>
            item.TituloMenu == "Nuevo menú" && item.Ruta == "Admin/Nuevo")), Times.Once);
    }

    [Fact]
    public async Task Save_rejects_blank_title_without_calling_backend()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        var controller = CreateController(backend, CreateAdminUser());

        var result = await controller.Save(new SgrMenuAdminViewModel
        {
            MenuID = 7,
            TituloMenu = "  "
        });

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal(7, redirect.RouteValues!["editId"]);
        Assert.Equal("El título es obligatorio.", controller.TempData["Error"]);
        backend.Verify(service => service.SaveSgrMenuAsync(It.IsAny<SgrMenuAdminViewModel>()), Times.Never);
    }

    [Fact]
    public async Task Delete_calls_backend_and_redirects()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        backend.Setup(service => service.DeleteSgrMenuAsync(9)).ReturnsAsync(true);
        var controller = CreateController(backend, CreateAdminUser());

        var result = await controller.Delete(9);

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal("Menú eliminado.", controller.TempData["Message"]);
        backend.Verify(service => service.DeleteSgrMenuAsync(9), Times.Once);
    }
}