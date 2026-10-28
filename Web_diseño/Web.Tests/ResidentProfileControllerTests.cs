using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Moq;
using System.Security.Claims;
using Web.Models.Admin;
using Web.Models.Residente;
using Web.Services;
using Xunit;
using ResidentPerfilController = Web.Controllers.Residente.PerfilController;

namespace Web.Tests;

public sealed class ResidentProfileControllerTests
{
    private static ResidentPerfilController CreateController(Mock<IGraphApiBackendService> backend, string? userEmail = "juan@test.com")
    {
        var controller = new ResidentPerfilController(backend.Object);

        var claims = new List<Claim>
        {
            new(ClaimTypes.Name, userEmail ?? string.Empty)
        };

        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"));
        var httpContext = new DefaultHttpContext { User = principal };
        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
        controller.TempData = new TempDataDictionary(httpContext, Mock.Of<ITempDataProvider>());
        return controller;
    }

    [Fact]
    public async Task Index_returns_view_with_profile_model()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        backend.Setup(service => service.GetPerfilByCorreoAsync("juan@test.com"))
            .ReturnsAsync(new PerfilViewModel
            {
                UsuarioID = 25,
                NombreUsuario = "Juan Residente",
                CorreoUsuario = "juan@test.com"
            });

        var controller = CreateController(backend);
        var result = await controller.Index();

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<PerfilViewModel>(view.Model);
        Assert.Equal(25, model.UsuarioID);
        Assert.Equal("Juan Residente", model.NombreUsuario);
    }

    [Fact]
    public async Task ActualizarPerfil_redirects_to_resident_index_when_valid()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        backend.Setup(service => service.UpdatePerfilAsync(25, "Juan Actualizado", "555-0000", null, null))
            .ReturnsAsync(true);

        var controller = CreateController(backend);
        var result = await controller.ActualizarPerfil(new PerfilViewModel
        {
            UsuarioID = 25,
            NombreUsuario = "Juan Actualizado",
            TelefonoUsuario = "555-0000"
        });

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal("Perfil actualizado.", controller.TempData["Message"]);
    }

    [Fact]
    public async Task CambiarPassword_rejects_mismatched_passwords()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        var controller = CreateController(backend);

        var result = await controller.CambiarPassword(25, new CambiarPasswordViewModel
        {
            PasswordNuevo = "NuevaClave1",
            PasswordConfirmar = "OtraClave1"
        });

        Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Las contraseñas no coinciden.", controller.TempData["Error"]);
        backend.Verify(service => service.CambiarPasswordAsync(It.IsAny<int>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task CrearMascota_sets_usuarioid_from_context_and_calls_save()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        const int expectedUsuarioId = 42;

        backend.Setup(s => s.SaveMascotaAsync(It.Is<MascotaFormViewModel>(m =>
            m.UsuarioID == expectedUsuarioId &&
            m.Nombre == "Fido" &&
            m.RazaLibre == "MiRaza")))
            .ReturnsAsync(true);

        var controller = CreateController(backend);
        var claims = new List<Claim>
        {
            new(ClaimTypes.Name, "juan@test.com"),
            new("usuario_id", expectedUsuarioId.ToString())
        };
        controller.ControllerContext.HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"));

        var result = await controller.CrearMascota(new MascotaFormViewModel { Nombre = "Fido", RazaLibre = "MiRaza" });

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal("Mascota guardada.", controller.TempData["Message"]);

        backend.Verify(s => s.SaveMascotaAsync(It.IsAny<MascotaFormViewModel>()), Times.Once);
    }

    [Fact]
    public async Task CrearAutomovil_sets_usuarioid_from_context_and_calls_save()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        const int expectedUsuarioId = 99;

        backend.Setup(s => s.SaveAutomovilAsync(It.Is<AutomovilFormViewModel>(m =>
            m.UsuarioID == expectedUsuarioId &&
            m.Placas == "ABC123" &&
            m.ModeloLibre == "ModeloX")))
            .ReturnsAsync(true);

        var controller = CreateController(backend);
        var claims = new List<Claim>
        {
            new(ClaimTypes.Name, "juan@test.com"),
            new("usuario_id", expectedUsuarioId.ToString())
        };
        controller.ControllerContext.HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"));

        var result = await controller.CrearAutomovil(new AutomovilFormViewModel { Placas = "ABC123", ModeloLibre = "ModeloX" });

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal("Automóvil guardado.", controller.TempData["Message"]);

        backend.Verify(s => s.SaveAutomovilAsync(It.IsAny<AutomovilFormViewModel>()), Times.Once);
    }

    [Fact]
    public async Task CrearMascota_rejects_missing_nombre()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        var controller = CreateController(backend);
        var claims = new List<Claim>
        {
            new(ClaimTypes.Name, "juan@test.com"),
            new("usuario_id", "42")
        };
        controller.ControllerContext.HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"));

        var result = await controller.CrearMascota(new MascotaFormViewModel { Nombre = "", RazaLibre = "RazaX" });

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal("Datos incompletos.", controller.TempData["Error"]);
        backend.Verify(s => s.SaveMascotaAsync(It.IsAny<MascotaFormViewModel>()), Times.Never);
    }

    [Fact]
    public async Task CrearAutomovil_rejects_missing_placas()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        var controller = CreateController(backend);
        var claims = new List<Claim>
        {
            new(ClaimTypes.Name, "juan@test.com"),
            new("usuario_id", "99")
        };
        controller.ControllerContext.HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"));

        var result = await controller.CrearAutomovil(new AutomovilFormViewModel { Placas = "", ModeloLibre = "ModelY" });

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal("Datos incompletos.", controller.TempData["Error"]);
        backend.Verify(s => s.SaveAutomovilAsync(It.IsAny<AutomovilFormViewModel>()), Times.Never);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task CrearMascota_rejects_invalid_names(string badName)
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        var controller = CreateController(backend);
        var claims = new List<Claim>
        {
            new(ClaimTypes.Name, "juan@test.com"),
            new("usuario_id", "42")
        };
        controller.ControllerContext.HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"));

        var result = await controller.CrearMascota(new MascotaFormViewModel { Nombre = badName, RazaLibre = "RazaX" });

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal("Datos incompletos.", controller.TempData["Error"]);
        backend.Verify(s => s.SaveMascotaAsync(It.IsAny<MascotaFormViewModel>()), Times.Never);
    }

    [Theory]
    [InlineData("A")]
    [InlineData("Fido")]
    [InlineData("Nombre Con Espacios")]
    public async Task CrearMascota_accepts_valid_names(string goodName)
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        const int expectedUsuarioId = 42;

        backend.Setup(s => s.SaveMascotaAsync(It.Is<MascotaFormViewModel>(m =>
            m.UsuarioID == expectedUsuarioId &&
            m.Nombre == goodName)))
            .ReturnsAsync(true);

        var controller = CreateController(backend);
        var claims = new List<Claim>
        {
            new(ClaimTypes.Name, "juan@test.com"),
            new("usuario_id", expectedUsuarioId.ToString())
        };
        controller.ControllerContext.HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"));

        var result = await controller.CrearMascota(new MascotaFormViewModel { Nombre = goodName, RazaLibre = "RazaX" });

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal("Mascota guardada.", controller.TempData["Message"]);

        backend.Verify(s => s.SaveMascotaAsync(It.IsAny<MascotaFormViewModel>()), Times.Once);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task CrearAutomovil_rejects_invalid_placas(string badPlacas)
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        var controller = CreateController(backend);
        var claims = new List<Claim>
        {
            new(ClaimTypes.Name, "juan@test.com"),
            new("usuario_id", "99")
        };
        controller.ControllerContext.HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"));

        var result = await controller.CrearAutomovil(new AutomovilFormViewModel { Placas = badPlacas, ModeloLibre = "ModelY" });

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal("Datos incompletos.", controller.TempData["Error"]);
        backend.Verify(s => s.SaveAutomovilAsync(It.IsAny<AutomovilFormViewModel>()), Times.Never);
    }

    [Theory]
    [InlineData("ABC123")]
    [InlineData("1A2B3C")]
    [InlineData("XYZ987")]
    public async Task CrearAutomovil_accepts_valid_placas(string goodPlacas)
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        const int expectedUsuarioId = 99;

        backend.Setup(s => s.SaveAutomovilAsync(It.Is<AutomovilFormViewModel>(m =>
            m.UsuarioID == expectedUsuarioId &&
            m.Placas == goodPlacas)))
            .ReturnsAsync(true);

        var controller = CreateController(backend);
        var claims = new List<Claim>
        {
            new(ClaimTypes.Name, "juan@test.com"),
            new("usuario_id", expectedUsuarioId.ToString())
        };
        controller.ControllerContext.HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"));

        var result = await controller.CrearAutomovil(new AutomovilFormViewModel { Placas = goodPlacas, ModeloLibre = "ModelY" });

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal("Automóvil guardado.", controller.TempData["Message"]);

        backend.Verify(s => s.SaveAutomovilAsync(It.IsAny<AutomovilFormViewModel>()), Times.Once);
    }
}