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

public sealed class ResidentesAdminControllerTests
{
    // ── helpers ──────────────────────────────────────────────────────────────

    private static ResidentesAdminController CreateController(
        Mock<IGraphApiBackendService> backend,
        ClaimsPrincipal? user = null)
    {
        var controller = new ResidentesAdminController(backend.Object);
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

    private static IReadOnlyList<ResidenteAdminViewModel> SampleResidentes() => new List<ResidenteAdminViewModel>
    {
        new()
        {
            UsuarioID = 1,
            Nombre = "Juan Pérez",
            Correo = "juan@example.com",
            bActivo = true,
            Casas = new List<CasaAdminViewModel>
            {
                new() { CasaID = 1, NombreCondominio = "Condominio A", DireccionCasa = "Calle 1", NumeroExtCasa = "123" }
            }
        }
    };

    // ── tests ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Index_ReturnsViewWithResidentes()
    {
        // Arrange
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        backend.Setup(b => b.GetResidentesAsync()).ReturnsAsync(SampleResidentes());
        var controller = CreateController(backend, CreateAdminUser());

        // Act
        var result = await controller.Index();

        // Assert
        var viewResult = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<ResidentesAdminPageViewModel>(viewResult.Model);
        Assert.Single(model.Items);
        Assert.Equal("Juan Pérez", model.Items.First().Nombre);
        backend.Verify(b => b.GetResidentesAsync(), Times.Once);
    }

    [Fact]
    public async Task Save_ValidModel_CallsServiceAndRedirects()
    {
        // Arrange
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        backend.Setup(b => b.SaveResidenteAsync(It.IsAny<ResidenteAdminFormViewModel>())).ReturnsAsync(true);
        var controller = CreateController(backend, CreateAdminUser());
        var model = new ResidenteAdminFormViewModel
        {
            UsuarioID = 1,
            Nombre = "Juan Pérez",
            Correo = "juan@example.com",
            bActivo = true
        };

        // Act
        var result = await controller.Save(model);

        // Assert
        var redirectResult = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirectResult.ActionName);
        backend.Verify(b => b.SaveResidenteAsync(It.Is<ResidenteAdminFormViewModel>(m =>
            m.UsuarioID == 1 && m.Nombre == "Juan Pérez")), Times.Once);
    }

    [Fact]
    public async Task Delete_ValidId_CallsServiceAndRedirects()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        backend.Setup(b => b.DeleteResidenteAsync(5)).ReturnsAsync(true);
        var controller = CreateController(backend, CreateAdminUser());

        var result = await controller.Delete(5);

        var redirectResult = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirectResult.ActionName);
        backend.Verify(b => b.DeleteResidenteAsync(5), Times.Once);
    }
}