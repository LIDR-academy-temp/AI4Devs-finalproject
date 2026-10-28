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

public sealed class MascotasAdminControllerTests
{
    // ── helpers ──────────────────────────────────────────────────────────────

    private static MascotasAdminController CreateController(
        Mock<IGraphApiBackendService> backend,
        ClaimsPrincipal? user = null)
    {
        var controller = new MascotasAdminController(backend.Object);
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

    private static IReadOnlyList<MascotaAdminViewModel> SampleMascotas() => new List<MascotaAdminViewModel>
    {
        new()
        {
            MascotaID = 1,
            UsuarioID = 1,
            NombreUsuario = "Juan Pérez",
            NombreMascota = "Firulais",
            RazaLibre = "Labrador",
            bEliminado = false
        }
    };

    private static IReadOnlyList<UsuarioLookupViewModel> SampleUsuarios() => new List<UsuarioLookupViewModel>
    {
        new() { UsuarioID = 1, NombreUsuario = "Juan Pérez", CorreoUsuario = "juan@example.com" }
    };

    // ── tests ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Index_ReturnsViewWithMascotasAndUsuarios()
    {
        // Arrange
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        backend.Setup(b => b.GetMascotasAdminAsync()).ReturnsAsync(SampleMascotas());
        backend.Setup(b => b.GetUsuariosAsync()).ReturnsAsync(SampleUsuarios());
        var controller = CreateController(backend, CreateAdminUser());

        // Act
        var result = await controller.Index();

        // Assert
        var viewResult = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<MascotasAdminPageViewModel>(viewResult.Model);
        Assert.Single(model.Items);
        Assert.Single(model.Usuarios);
        Assert.Equal("Firulais", model.Items.First().NombreMascota);
        backend.Verify(b => b.GetMascotasAdminAsync(), Times.Once);
        backend.Verify(b => b.GetUsuariosAsync(), Times.Once);
    }

    [Fact]
    public async Task Save_ValidModel_CallsServiceAndRedirects()
    {
        // Arrange
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        backend.Setup(b => b.SaveMascotaAdminAsync(It.IsAny<MascotaAdminFormViewModel>())).ReturnsAsync(true);
        var controller = CreateController(backend, CreateAdminUser());
        var model = new MascotaAdminFormViewModel
        {
            MascotaID = null,
            UsuarioID = 1,
            NombreMascota = "Firulais",
            RazaLibre = "Labrador"
        };

        // Act
        var result = await controller.Save(model);

        // Assert
        var redirectResult = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirectResult.ActionName);
        backend.Verify(b => b.SaveMascotaAdminAsync(It.Is<MascotaAdminFormViewModel>(m =>
            m.UsuarioID == 1 && m.NombreMascota == "Firulais")), Times.Once);
    }

    [Fact]
    public async Task Delete_ValidId_CallsServiceAndRedirects()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        backend.Setup(b => b.DeleteMascotaAsync(7)).ReturnsAsync(true);
        var controller = CreateController(backend, CreateAdminUser());

        var result = await controller.Delete(7);

        var redirectResult = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirectResult.ActionName);
        backend.Verify(b => b.DeleteMascotaAsync(7), Times.Once);
    }
}