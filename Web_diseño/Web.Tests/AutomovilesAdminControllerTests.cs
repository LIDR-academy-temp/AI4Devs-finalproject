using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using System.Security.Claims;
using Web.Controllers.Admin;
using Web.Models.Admin;
using Web.Services;
using Xunit;

namespace Web.Tests;

public sealed class AutomovilesAdminControllerTests
{
    // ── helpers ──────────────────────────────────────────────────────────────

    private static AutomovilesAdminController CreateController(
        Mock<IGraphApiBackendService> backend,
        ClaimsPrincipal? user = null)
    {
        var controller = new AutomovilesAdminController(backend.Object);
        var httpContext = new DefaultHttpContext
        {
            User = user ?? new ClaimsPrincipal(new ClaimsIdentity())
        };
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };
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

    private static IReadOnlyList<AutomovilAdminViewModel> SampleAutomoviles() => new List<AutomovilAdminViewModel>
    {
        new()
        {
            AutomovilID = 1,
            UsuarioID = 1,
            NombreUsuario = "Juan Pérez",
            ModeloLibre = "Toyota Corolla",
            Placas = "ABC123",
            bEliminado = false
        }
    };

    private static IReadOnlyList<UsuarioLookupViewModel> SampleUsuarios() => new List<UsuarioLookupViewModel>
    {
        new() { UsuarioID = 1, NombreUsuario = "Juan Pérez", CorreoUsuario = "juan@example.com" }
    };

    // ── tests ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Index_ReturnsViewWithAutomovilesAndUsuarios()
    {
        // Arrange
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        backend.Setup(b => b.GetAutomovilesAdminAsync()).ReturnsAsync(SampleAutomoviles());
        backend.Setup(b => b.GetUsuariosAsync()).ReturnsAsync(SampleUsuarios());
        var controller = CreateController(backend, CreateAdminUser());

        // Act
        var result = await controller.Index();

        // Assert
        var viewResult = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<AutomovilesAdminPageViewModel>(viewResult.Model);
        Assert.Single(model.Items);
        Assert.Single(model.Usuarios);
        Assert.Equal("ABC123", model.Items.First().Placas);
        backend.Verify(b => b.GetAutomovilesAdminAsync(), Times.Once);
        backend.Verify(b => b.GetUsuariosAsync(), Times.Once);
    }

    [Fact]
    public async Task Save_ValidModel_CallsServiceAndRedirects()
    {
        // Arrange
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        backend.Setup(b => b.SaveAutomovilAdminAsync(It.IsAny<AutomovilAdminFormViewModel>())).ReturnsAsync(true);
        var controller = CreateController(backend, CreateAdminUser());
        var model = new AutomovilAdminFormViewModel
        {
            AutomovilID = null,
            UsuarioID = 1,
            ModeloLibre = "Toyota Corolla",
            Placas = "ABC123"
        };

        // Act
        var result = await controller.Save(model);

        // Assert
        var redirectResult = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirectResult.ActionName);
        backend.Verify(b => b.SaveAutomovilAdminAsync(It.Is<AutomovilAdminFormViewModel>(m =>
            m.UsuarioID == 1 && m.Placas == "ABC123")), Times.Once);
    }

    [Fact]
    public async Task Delete_ValidId_CallsServiceAndRedirects()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        backend.Setup(b => b.DeleteAutomovilAsync(9)).ReturnsAsync(true);
        var controller = CreateController(backend, CreateAdminUser());

        var result = await controller.Delete(9);

        var redirectResult = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirectResult.ActionName);
        backend.Verify(b => b.DeleteAutomovilAsync(9), Times.Once);
    }
}