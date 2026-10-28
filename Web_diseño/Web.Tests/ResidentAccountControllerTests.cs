using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Moq;
using System.Security.Claims;
using Web.Models.Admin;
using Web.Models.Residente;
using Web.Services;
using Xunit;
using ResidentCuentaController = Web.Controllers.Residente.CuentaController;

namespace Web.Tests;

public sealed class ResidentAccountControllerTests
{
    private static ClaimsPrincipal CreateUser(int usuarioId = 25, bool isAdmin = false)
    {
        var claims = new List<Claim>
        {
            new(CotoContext.UsuarioIdClaim, usuarioId.ToString()),
            new(CotoContext.EsAdminClaim, isAdmin ? "true" : "false")
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

    private static ResidentCuentaController CreateController(
        Mock<IGraphApiBackendService> backend,
        Mock<IResidentPortalService> residentPortal,
        bool activeProperty = true)
    {
        residentPortal.Setup(service => service.GetContextAsync(It.IsAny<ClaimsPrincipal>()))
            .ReturnsAsync(BuildActiveContext(activeProperty));

        var controller = new ResidentCuentaController(backend.Object, residentPortal.Object);
        var httpContext = new DefaultHttpContext
        {
            User = CreateUser()
        };

        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
        controller.TempData = new TempDataDictionary(httpContext, Mock.Of<ITempDataProvider>());
        return controller;
    }

    [Fact]
    public async Task Index_returns_only_items_for_active_house_and_metrics()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        backend.Setup(service => service.GetCuotasAsync()).ReturnsAsync(new[]
        {
            new CuotaFormViewModel { CuotaID = 1, UsuarioID = 25, CasaID = 8, Monto = 1000m, Pagado = false, FechaVencimiento = DateTime.Today.AddDays(2), PeriodoInicio = DateTime.Today.AddDays(-15), PeriodoFin = DateTime.Today.AddDays(15) },
            new CuotaFormViewModel { CuotaID = 2, UsuarioID = 25, CasaID = 8, Monto = 500m, Pagado = true, FechaPago = DateTime.Today.AddDays(-3), PeriodoInicio = DateTime.Today.AddMonths(-1), PeriodoFin = DateTime.Today.AddDays(-1) },
            new CuotaFormViewModel { CuotaID = 3, UsuarioID = 25, CasaID = 9, Monto = 300m, Pagado = false, FechaVencimiento = DateTime.Today.AddDays(5), PeriodoInicio = DateTime.Today, PeriodoFin = DateTime.Today.AddMonths(1) }
        });
        backend.Setup(service => service.GetCasasAsync()).ReturnsAsync(new[]
        {
            new CasaFormViewModel { CasaID = 8, CondominioID = 1, DireccionCasa = "Amapolas", NumeroExtCasa = "8", NombreCondominio = "Cuarta Quinientos" }
        });
        backend.Setup(service => service.GetCondominiosAsync()).ReturnsAsync(new[]
        {
            new CondominioFormViewModel { CondominioID = 1, NombreCondominio = "Cuarta Quinientos", DireccionCondominio = "Av. Principal 500" }
        });

        var residentPortal = new Mock<IResidentPortalService>(MockBehavior.Loose);
        var controller = CreateController(backend, residentPortal);

        var result = await controller.Index();

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<ResidentAccountPageViewModel>(view.Model);
        Assert.Equal(2, model.Items.Count);
        Assert.Equal(1000m, model.SaldoPendiente);
        Assert.Equal(500m, model.TotalPagado);
        Assert.Equal(1, model.CuotasPendientes);
        Assert.Equal(1, model.CuotasPagadas);
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