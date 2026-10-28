using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Moq;
using System.Security.Claims;
using Web.Models.Admin;
using Web.Models.Residente;
using Web.Services;
using Xunit;
using ResidentPasesController = Web.Controllers.Residente.PasesController;

namespace Web.Tests;

public sealed class ResidentPassesControllerTests
{
    private static ClaimsPrincipal CreateUser(int usuarioId = 25, bool isAdmin = false)
    {
        var claims = new List<Claim>
        {
            new(CotoContext.UsuarioIdClaim, usuarioId.ToString()),
            new(CotoContext.EsAdminClaim, isAdmin ? "true" : "false"),
            new(ClaimTypes.Name, "Residente Demo")
        };

        return new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"));
    }

    private static ResidentPortalContextViewModel BuildActiveContext(bool activeProperty = true)
    {
        return new ResidentPortalContextViewModel
        {
            UsuarioId = 25,
            IsResident = true,
            Properties = new[]
            {
                new ResidentPropertyOptionViewModel
                {
                    CondominioId = 1,
                    CondominioName = "Cuarta Quinientos",
                    CasaId = 8,
                    CasaLabel = "Casa 8"
                }
            },
            SelectedCondominioId = activeProperty ? 1 : null,
            SelectedCondominioName = activeProperty ? "Cuarta Quinientos" : string.Empty,
            SelectedCasaId = activeProperty ? 8 : null,
            SelectedCasaLabel = activeProperty ? "Casa 8" : null,
            RequiresPropertySelection = !activeProperty,
            StatusMessage = activeProperty ? null : "Selecciona una vivienda"
        };
    }

    private static ResidentPasesController CreateController(
        Mock<IGraphApiBackendService> backend,
        Mock<IResidentPortalService> residentPortal,
        bool activeProperty = true)
    {
        residentPortal.Setup(service => service.GetContextAsync(It.IsAny<ClaimsPrincipal>()))
            .ReturnsAsync(BuildActiveContext(activeProperty));

        var controller = new ResidentPasesController(backend.Object, residentPortal.Object);
        var httpContext = new DefaultHttpContext
        {
            User = CreateUser(),
            Request = { Scheme = "https", Host = new HostString("localhost") }
        };

        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
        controller.TempData = new TempDataDictionary(httpContext, Mock.Of<ITempDataProvider>());
        return controller;
    }

    [Fact]
    public async Task Index_returns_only_passes_for_current_resident_and_active_house()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        backend.Setup(service => service.GetTipoIdentificacionesAsync()).ReturnsAsync(new[]
        {
            new TipoIdentificacionLookupViewModel { TipoIdentificacionID = 2, TipoIdentificacion = "INE" }
        });
        backend.Setup(service => service.GetCasasAsync()).ReturnsAsync(new[]
        {
            new CasaFormViewModel { CasaID = 8, CondominioID = 1, DireccionCasa = "Amapolas", NumeroExtCasa = "8" }
        });
        backend.Setup(service => service.GetPasesQrAsync()).ReturnsAsync(new[]
        {
            new PaseQrFormViewModel { VisitaGeneradaID = 1, NombreVisitante = "Juan Perez", UsuarioVisitadoID = 25, CasaID = 8, TipoIdentificacionID = 2, TipoIdentificacion = "INE", NumeroIdentificacion = "ABC123", CodigoQR = "code-1", FechaEmision = DateTime.Now, FechaExpira = DateTime.Now.AddHours(4) },
            new PaseQrFormViewModel { VisitaGeneradaID = 2, NombreVisitante = "Otra Casa", UsuarioVisitadoID = 25, CasaID = 9, TipoIdentificacionID = 2, TipoIdentificacion = "INE", NumeroIdentificacion = "XYZ999", CodigoQR = "code-2", FechaEmision = DateTime.Now, FechaExpira = DateTime.Now.AddHours(4) },
            new PaseQrFormViewModel { VisitaGeneradaID = 3, NombreVisitante = "Otro Residente", UsuarioVisitadoID = 99, CasaID = 8, TipoIdentificacionID = 2, TipoIdentificacion = "INE", NumeroIdentificacion = "QQQ111", CodigoQR = "code-3", FechaEmision = DateTime.Now, FechaExpira = DateTime.Now.AddHours(4) }
        });

        var residentPortal = new Mock<IResidentPortalService>(MockBehavior.Loose);
        var controller = CreateController(backend, residentPortal);

        var result = await controller.Index();

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<ResidentPassPageViewModel>(view.Model);
        Assert.Single(model.Items);
        Assert.Equal(1, model.Items[0].VisitaGeneradaID);
        Assert.Equal(1, model.TotalVigentes);
    }

    [Fact]
    public async Task Guardar_forces_resident_scope_for_user_and_house()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        backend.Setup(service => service.GetTipoIdentificacionesAsync()).ReturnsAsync(new[]
        {
            new TipoIdentificacionLookupViewModel { TipoIdentificacionID = 2, TipoIdentificacion = "INE" }
        });
        backend.Setup(service => service.GetCasasAsync()).ReturnsAsync(Array.Empty<CasaFormViewModel>());
        backend.Setup(service => service.GetPasesQrAsync()).ReturnsAsync(Array.Empty<PaseQrFormViewModel>());

        PaseQrFormViewModel? saved = null;
        backend.Setup(service => service.SavePaseQrAsync(It.IsAny<PaseQrFormViewModel>()))
            .Callback<PaseQrFormViewModel>(item => saved = item)
            .ReturnsAsync(true);

        var residentPortal = new Mock<IResidentPortalService>(MockBehavior.Loose);
        var controller = CreateController(backend, residentPortal);

        var result = await controller.Guardar(new PaseQrFormViewModel
        {
            NombreVisitante = "Juan Perez",
            UsuarioVisitadoID = 900,
            CasaID = 77,
            TipoIdentificacionID = 2,
            NumeroIdentificacion = "ABC123",
            FechaEmision = DateTime.Now,
            FechaExpira = DateTime.Now.AddHours(2)
        });

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<ResidentPassPageViewModel>(view.Model);
        Assert.Equal("Pase QR generado.", model.Message);
        Assert.NotNull(saved);
        Assert.Equal(25, saved!.UsuarioVisitadoID);
        Assert.Equal(8, saved.CasaID);
        Assert.False(string.IsNullOrWhiteSpace(saved.CodigoQR));
    }

    [Fact]
    public async Task Index_redirects_to_acceso_when_property_selection_is_required()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        var residentPortal = new Mock<IResidentPortalService>(MockBehavior.Loose);
        var controller = CreateController(backend, residentPortal, activeProperty: false);

        var result = await controller.Index();

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal("Acceso", redirect.ControllerName);
    }
}