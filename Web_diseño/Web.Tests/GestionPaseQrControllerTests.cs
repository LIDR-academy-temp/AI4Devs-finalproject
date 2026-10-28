using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Moq;
using System.Security.Claims;
using Web.Controllers.Catalogos;
using Web.Models.Admin;
using Web.Services;
using Xunit;

namespace Web.Tests;

public sealed class GestionPaseQrControllerTests
{
    private static PaseQrController CreateController(Mock<IGraphApiBackendService> backend, ClaimsPrincipal? user = null)
    {
        var controller = new PaseQrController(backend.Object);
        var httpContext = new DefaultHttpContext
        {
            User = user ?? new ClaimsPrincipal(new ClaimsIdentity())
        };
        httpContext.Request.Scheme = "https";
        httpContext.Request.Host = new HostString("localhost");

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

    private static void SetupLookups(Mock<IGraphApiBackendService> backend)
    {
        backend.Setup(service => service.GetCasasAsync()).ReturnsAsync(new[]
        {
            new CasaFormViewModel { CasaID = 8, CondominioID = 1, NombreCondominio = "Cuarta Quinientos", DireccionCasa = "Amapolas", NumeroExtCasa = "8" }
        });
        backend.Setup(service => service.GetUsuariosAsync()).ReturnsAsync(new[]
        {
            new UsuarioLookupViewModel { UsuarioID = 5, NombreUsuario = "Ana López", CorreoUsuario = "ana@example.com" }
        });
        backend.Setup(service => service.GetTipoIdentificacionesAsync()).ReturnsAsync(new[]
        {
            new TipoIdentificacionLookupViewModel { TipoIdentificacionID = 2, TipoIdentificacion = "INE" }
        });
    }

    [Fact]
    public async Task Index_returns_view_with_qr_stats_and_form_selection()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        SetupLookups(backend);
        backend.Setup(service => service.GetPasesQrAsync()).ReturnsAsync(new[]
        {
            new PaseQrFormViewModel
            {
                VisitaGeneradaID = 1,
                NombreVisitante = "Invitado Uno",
                UsuarioVisitadoID = 5,
                CasaID = 8,
                TipoIdentificacionID = 2,
                NumeroIdentificacion = "ABC123",
                CodigoQR = "vigente",
                FechaEmision = DateTime.Now.AddHours(-1),
                FechaExpira = DateTime.Now.AddHours(2),
                bUsado = false,
                bEliminado = false
            },
            new PaseQrFormViewModel
            {
                VisitaGeneradaID = 2,
                NombreVisitante = "Invitado Dos",
                UsuarioVisitadoID = 5,
                CasaID = 8,
                TipoIdentificacionID = 2,
                NumeroIdentificacion = "XYZ999",
                CodigoQR = "usado",
                FechaEmision = DateTime.Now.AddHours(-5),
                FechaExpira = DateTime.Now.AddHours(1),
                bUsado = true,
                bEliminado = false
            }
        });
        var controller = CreateController(backend, CreateAdminUser());

        var result = await controller.Index(editId: 1, soloVigentes: true);

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<PaseQrPageViewModel>(view.Model);
        Assert.Single(model.Items);
        Assert.Equal(1, model.Form.VisitaGeneradaID);
        Assert.Equal(1, model.TotalVigentes);
        Assert.Equal(1, model.TotalUsados);
        Assert.Single(model.CasaOptions);
        Assert.Single(model.UsuarioOptions);
    }

    [Fact]
    public async Task Save_generates_qr_code_and_returns_success_view()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        SetupLookups(backend);
        backend.Setup(service => service.GetPasesQrAsync()).ReturnsAsync(Array.Empty<PaseQrFormViewModel>());

        PaseQrFormViewModel? saved = null;
        backend.Setup(service => service.SavePaseQrAsync(It.IsAny<PaseQrFormViewModel>()))
            .Callback<PaseQrFormViewModel>(item => saved = item)
            .ReturnsAsync(true);

        var controller = CreateController(backend, CreateAdminUser());

        var result = await controller.Save(new PaseQrFormViewModel
        {
            NombreVisitante = "Invitado Uno",
            UsuarioVisitadoID = 5,
            CasaID = 8,
            TipoIdentificacionID = 2,
            NumeroIdentificacion = "ABC123",
            FechaEmision = DateTime.Now,
            FechaExpira = DateTime.Now.AddHours(2)
        });

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<PaseQrPageViewModel>(view.Model);
        Assert.Equal("Pase QR generado.", model.Message);
        Assert.NotNull(saved);
        Assert.False(string.IsNullOrWhiteSpace(saved!.CodigoQR));
        Assert.Contains("/Gestion/Pase-QR/Validar/", model.Form.ValidationUrl);
        backend.Verify(service => service.SavePaseQrAsync(It.IsAny<PaseQrFormViewModel>()), Times.Once);
    }

    [Fact]
    public async Task Delete_valid_id_calls_backend_and_redirects()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        backend.Setup(service => service.DeletePaseQrAsync(1)).ReturnsAsync(true);
        var controller = CreateController(backend, CreateAdminUser());

        var result = await controller.Delete(1);

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal("Pase QR eliminado.", controller.TempData["Message"]);
        backend.Verify(service => service.DeletePaseQrAsync(1), Times.Once);
    }
}