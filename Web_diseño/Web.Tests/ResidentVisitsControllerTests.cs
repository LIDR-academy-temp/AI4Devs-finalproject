using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Moq;
using System.Security.Claims;
using Web.Models.Admin;
using Web.Models.Residente;
using Web.Services;
using Xunit;
using ResidentVisitasController = Web.Controllers.Residente.VisitasController;

namespace Web.Tests;

public sealed class ResidentVisitsControllerTests
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

    private static ResidentVisitasController CreateController(
        Mock<IGraphApiBackendService> backend,
        Mock<IResidentPortalService> residentPortal,
        bool activeProperty = true)
    {
        residentPortal.Setup(service => service.GetContextAsync(It.IsAny<ClaimsPrincipal>()))
            .ReturnsAsync(BuildActiveContext(activeProperty));

        var env = new Mock<IWebHostEnvironment>(MockBehavior.Loose);
        env.SetupGet(item => item.WebRootPath).Returns(Path.GetTempPath());

        var controller = new ResidentVisitasController(backend.Object, residentPortal.Object, env.Object);
        var httpContext = new DefaultHttpContext
        {
            User = CreateUser()
        };

        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
        controller.TempData = new TempDataDictionary(httpContext, Mock.Of<ITempDataProvider>());
        return controller;
    }

    [Fact]
    public async Task Index_returns_only_visits_for_current_resident_and_active_house()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        backend.Setup(service => service.GetTipoIdentificacionesAsync()).ReturnsAsync(new[]
        {
            new TipoIdentificacionLookupViewModel { TipoIdentificacionID = 2, TipoIdentificacion = "INE" }
        });
        backend.Setup(service => service.GetCasasAsync()).ReturnsAsync(new[]
        {
            new CasaFormViewModel { CasaID = 8, CondominioID = 1, NombreCondominio = "Cuarta Quinientos", DireccionCasa = "Amapolas", NumeroExtCasa = "8" }
        });
        backend.Setup(service => service.GetVisitasAsync()).ReturnsAsync(new[]
        {
            new VisitaFormViewModel { VisitaID = 1, VisitanteNombre = "Juan Perez", UsuarioVisitadoID = 25, CasaID = 8, TipoIdentificacionID = 2, NumeroIdentificacion = "ABC123", FechaEntrada = DateTime.Now.AddHours(2), FechaSalida = DateTime.Now.AddHours(4) },
            new VisitaFormViewModel { VisitaID = 2, VisitanteNombre = "Otra Casa", UsuarioVisitadoID = 25, CasaID = 9, TipoIdentificacionID = 2, NumeroIdentificacion = "XYZ999", FechaEntrada = DateTime.Now.AddHours(2), FechaSalida = DateTime.Now.AddHours(4) },
            new VisitaFormViewModel { VisitaID = 3, VisitanteNombre = "Otro Residente", UsuarioVisitadoID = 99, CasaID = 8, TipoIdentificacionID = 2, NumeroIdentificacion = "QQQ111", FechaEntrada = DateTime.Now.AddHours(2), FechaSalida = DateTime.Now.AddHours(4) }
        });

        var residentPortal = new Mock<IResidentPortalService>(MockBehavior.Loose);
        var controller = CreateController(backend, residentPortal);

        var result = await controller.Index();

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<ResidentVisitPageViewModel>(view.Model);
        Assert.Single(model.Items);
        Assert.Equal(1, model.Items[0].VisitaID);
        Assert.Equal(1, model.TotalVisitas);
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
        backend.Setup(service => service.GetVisitasAsync()).ReturnsAsync(Array.Empty<VisitaFormViewModel>());

        VisitaFormViewModel? saved = null;
        backend.Setup(service => service.SaveVisitaAsync(It.IsAny<VisitaFormViewModel>()))
            .Callback<VisitaFormViewModel>(item => saved = item)
            .ReturnsAsync(true);

        var residentPortal = new Mock<IResidentPortalService>(MockBehavior.Loose);
        var controller = CreateController(backend, residentPortal);

        var result = await controller.Guardar(new VisitaFormViewModel
        {
            VisitanteNombre = "Juan Perez",
            UsuarioVisitadoID = 900,
            CasaID = 77,
            TipoIdentificacionID = 2,
            NumeroIdentificacion = "ABC123",
            FechaEntrada = DateTime.Now.AddHours(2),
            FechaSalida = DateTime.Now.AddHours(4)
        });

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.NotNull(saved);
        Assert.Equal(25, saved!.UsuarioVisitadoID);
        Assert.Equal(8, saved.CasaID);
        Assert.True(saved.Autorizado);
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