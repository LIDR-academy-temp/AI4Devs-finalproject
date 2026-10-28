using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Moq;
using System.Security.Claims;
using Web.Controllers.Perfil;
using Web.Models.Admin;
using Web.Services;
using Xunit;

namespace Web.Tests;

public sealed class PerfilControllerTests
{
    // ── helpers ──────────────────────────────────────────────────────────────

    private static PerfilController CreateController(Mock<IGraphApiBackendService> backend, string? userEmail = "juan@test.com")
    {
        var controller = new PerfilController(backend.Object);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.Name, userEmail ?? string.Empty)
        };
        var identity = new ClaimsIdentity(claims, "Test");
        var principal = new ClaimsPrincipal(identity);

        var httpContext = new DefaultHttpContext { User = principal };
        var tempData = new TempDataDictionary(httpContext, Mock.Of<ITempDataProvider>());

        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
        controller.TempData = tempData;
        return controller;
    }

    // ── Index ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Index_returns_view_with_perfil_when_user_found()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        backend.Setup(s => s.GetPerfilByCorreoAsync("juan@test.com"))
               .ReturnsAsync(new PerfilViewModel
               {
                   UsuarioID = 7,
                   NombreUsuario = "Juan",
                   CorreoUsuario = "juan@test.com",
                   TelefonoUsuario = "555-1234"
               });

        var controller = CreateController(backend);
        var result = await controller.Index();

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<PerfilViewModel>(view.Model);
        Assert.Equal(7, model.UsuarioID);
        Assert.Equal("Juan", model.NombreUsuario);
        Assert.Equal("555-1234", model.TelefonoUsuario);
    }

    [Fact]
    public async Task Index_returns_fallback_model_when_user_not_found()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        backend.Setup(s => s.GetPerfilByCorreoAsync("juan@test.com"))
               .ReturnsAsync((PerfilViewModel?)null);

        var controller = CreateController(backend);
        var result = await controller.Index();

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<PerfilViewModel>(view.Model);
        Assert.Equal("juan@test.com", model.NombreUsuario);
        Assert.Equal("juan@test.com", model.CorreoUsuario);
    }

    // ── ActualizarPerfil ──────────────────────────────────────────────────────

    [Fact]
    public async Task ActualizarPerfil_redirects_and_calls_update_when_valid()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        backend.Setup(s => s.UpdatePerfilAsync(7, "Juan Actualizado", "555-9999", null, null))
               .ReturnsAsync(true);

        var controller = CreateController(backend);
        var model = new PerfilViewModel
        {
            UsuarioID = 7,
            NombreUsuario = "Juan Actualizado",
            TelefonoUsuario = "555-9999"
        };

        var result = await controller.ActualizarPerfil(model);

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        backend.Verify(s => s.UpdatePerfilAsync(7, "Juan Actualizado", "555-9999", null, null), Times.Once);
        Assert.Equal("Perfil actualizado.", controller.TempData["Message"]);
    }

    [Fact]
    public async Task ActualizarPerfil_redirects_with_error_when_usuarioId_is_zero()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        var controller = CreateController(backend);
        var model = new PerfilViewModel { UsuarioID = 0, NombreUsuario = "X" };

        var result = await controller.ActualizarPerfil(model);

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        backend.Verify(s => s.UpdatePerfilAsync(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string?>()), Times.Never);
        Assert.Equal("Datos incompletos.", controller.TempData["Error"]);
    }

    [Fact]
    public async Task ActualizarPerfil_redirects_with_error_when_nombre_is_empty()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        var controller = CreateController(backend);
        var model = new PerfilViewModel { UsuarioID = 5, NombreUsuario = "" };

        var result = await controller.ActualizarPerfil(model);

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        backend.Verify(s => s.UpdatePerfilAsync(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string?>()), Times.Never);
        Assert.Equal("Datos incompletos.", controller.TempData["Error"]);
    }

    // ── CambiarPassword ───────────────────────────────────────────────────────

    [Fact]
    public async Task CambiarPassword_redirects_and_calls_service_when_valid()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        backend.Setup(s => s.CambiarPasswordAsync(7, "NuevaClave1"))
               .ReturnsAsync(true);

        var controller = CreateController(backend);
        var model = new CambiarPasswordViewModel
        {
            PasswordNuevo = "NuevaClave1",
            PasswordConfirmar = "NuevaClave1"
        };

        var result = await controller.CambiarPassword(7, model);

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        backend.Verify(s => s.CambiarPasswordAsync(7, "NuevaClave1"), Times.Once);
        Assert.Equal("Contraseña actualizada correctamente.", controller.TempData["Message"]);
    }

    [Fact]
    public async Task CambiarPassword_rejects_when_passwords_do_not_match()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        var controller = CreateController(backend);
        var model = new CambiarPasswordViewModel
        {
            PasswordNuevo = "Abc123",
            PasswordConfirmar = "Xyz999"
        };

        var result = await controller.CambiarPassword(7, model);

        Assert.IsType<RedirectToActionResult>(result);
        backend.Verify(s => s.CambiarPasswordAsync(It.IsAny<int>(), It.IsAny<string>()), Times.Never);
        Assert.Equal("Las contraseñas no coinciden.", controller.TempData["Error"]);
    }

    [Fact]
    public async Task CambiarPassword_rejects_when_password_too_short()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        var controller = CreateController(backend);
        var model = new CambiarPasswordViewModel
        {
            PasswordNuevo = "abc",
            PasswordConfirmar = "abc"
        };

        var result = await controller.CambiarPassword(7, model);

        Assert.IsType<RedirectToActionResult>(result);
        backend.Verify(s => s.CambiarPasswordAsync(It.IsAny<int>(), It.IsAny<string>()), Times.Never);
        Assert.Equal("La contraseña debe tener al menos 6 caracteres.", controller.TempData["Error"]);
    }

    [Fact]
    public async Task CambiarPassword_rejects_when_usuarioId_is_zero()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        var controller = CreateController(backend);
        var model = new CambiarPasswordViewModel
        {
            PasswordNuevo = "Valido123",
            PasswordConfirmar = "Valido123"
        };

        var result = await controller.CambiarPassword(0, model);

        Assert.IsType<RedirectToActionResult>(result);
        backend.Verify(s => s.CambiarPasswordAsync(It.IsAny<int>(), It.IsAny<string>()), Times.Never);
        Assert.Equal("El usuario y la nueva contraseña son obligatorios.", controller.TempData["Error"]);
    }
}
