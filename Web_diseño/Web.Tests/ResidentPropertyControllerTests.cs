using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Moq;
using System.Security.Claims;
using Web.Models.Admin;
using Web.Models.Residente;
using Web.Services;
using Xunit;
using ResidentViviendaController = Web.Controllers.Residente.ViviendaController;

namespace Web.Tests;

public sealed class ResidentPropertyControllerTests
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
                    CasaLabel = "Casa 8",
                    CondominioAddress = "Av. Principal 500"
                },
                new ResidentPropertyOptionViewModel
                {
                    CondominioId = 2,
                    CondominioName = "Altos del Lago",
                    CasaId = 13,
                    CasaLabel = "Casa 13",
                    CondominioAddress = "Lago Azul 22"
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

    private static ResidentViviendaController CreateController(
        Mock<IGraphApiBackendService> backend,
        Mock<IResidentPortalService> residentPortal,
        bool activeProperty = true)
    {
        residentPortal.Setup(service => service.GetContextAsync(It.IsAny<ClaimsPrincipal>()))
            .ReturnsAsync(BuildActiveContext(activeProperty));

        var controller = new ResidentViviendaController(backend.Object, residentPortal.Object);
        var httpContext = new DefaultHttpContext
        {
            User = CreateUser()
        };

        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
        controller.TempData = new TempDataDictionary(httpContext, Mock.Of<ITempDataProvider>());
        return controller;
    }

    [Fact]
    public async Task Index_returns_view_with_active_property_details()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        backend.Setup(service => service.GetCasasAsync()).ReturnsAsync(new[]
        {
            new CasaFormViewModel
            {
                CasaID = 8,
                CondominioID = 1,
                DireccionCasa = "Amapolas",
                NumeroExtCasa = "8",
                NombreCondominio = "Cuarta Quinientos",
                DireccionCondominio = "Av. Principal 500",
                NombrePropietario = "Juan Residente",
                CorreoPropietario = "juan@test.com",
                TelefonoPropietario = "555-1000"
            }
        });
        backend.Setup(service => service.GetCondominiosAsync()).ReturnsAsync(new[]
        {
            new CondominioFormViewModel { CondominioID = 1, NombreCondominio = "Cuarta Quinientos", DireccionCondominio = "Av. Principal 500" }
        });

        var residentPortal = new Mock<IResidentPortalService>(MockBehavior.Loose);
        var controller = CreateController(backend, residentPortal);

        var result = await controller.Index();

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<ResidentPropertyPageViewModel>(view.Model);
        Assert.Equal(8, model.ActiveCasa?.CasaID);
        Assert.Equal("Cuarta Quinientos", model.ActiveCondominio?.NombreCondominio);
        Assert.Equal(2, model.AvailableProperties.Count);
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