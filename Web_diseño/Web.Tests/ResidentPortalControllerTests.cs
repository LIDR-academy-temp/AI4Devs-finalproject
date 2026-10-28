using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Moq;
using System.Security.Claims;
using Web.Controllers.Residente;
using Web.Models.Residente;
using Web.Services;
using Xunit;

namespace Web.Tests;

public sealed class ResidentPortalControllerTests
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

    private static ResidentPortalContextViewModel BuildSelectionContext(bool activeProperty = false)
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
                },
                new ResidentPropertyOptionViewModel
                {
                    CondominioId = 2,
                    CondominioName = "Altos del Lago",
                    CasaId = 13,
                    CasaLabel = "Casa 13"
                }
            },
            SelectedCondominioId = activeProperty ? 1 : null,
            SelectedCondominioName = activeProperty ? "Cuarta Quinientos" : string.Empty,
            SelectedCasaId = activeProperty ? 8 : null,
            SelectedCasaLabel = activeProperty ? "Casa 8" : null,
            RequiresPropertySelection = !activeProperty,
            StatusTitle = activeProperty ? null : "Selecciona una vivienda",
            StatusMessage = activeProperty ? null : "Debes elegir una vivienda para continuar."
        };
    }

    private static AccesoController CreateAccesoController(Mock<IResidentPortalService> residentPortal, ClaimsPrincipal? user = null)
    {
        var controller = new AccesoController(residentPortal.Object);
        var httpContext = new DefaultHttpContext
        {
            User = user ?? CreateUser()
        };

        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
        controller.TempData = new TempDataDictionary(httpContext, Mock.Of<ITempDataProvider>());
        return controller;
    }

    private static InicioController CreateInicioController(Mock<IResidentPortalService> residentPortal, ClaimsPrincipal? user = null)
    {
        var controller = new InicioController(residentPortal.Object);
        var httpContext = new DefaultHttpContext
        {
            User = user ?? CreateUser()
        };

        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
        controller.TempData = new TempDataDictionary(httpContext, Mock.Of<ITempDataProvider>());
        return controller;
    }

    [Fact]
    public async Task Acceso_returns_selection_view_when_property_selection_is_required()
    {
        var residentPortal = new Mock<IResidentPortalService>(MockBehavior.Loose);
        residentPortal.Setup(s => s.GetContextAsync(It.IsAny<ClaimsPrincipal>()))
            .ReturnsAsync(BuildSelectionContext());

        var controller = CreateAccesoController(residentPortal);
        var result = await controller.Index();

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<ResidentAccessPageViewModel>(view.Model);
        Assert.True(model.Context.RequiresPropertySelection);
        Assert.Equal(2, model.Context.Properties.Count);
    }

    [Fact]
    public async Task Acceso_redirects_to_inicio_when_active_property_exists_and_force_is_not_requested()
    {
        var residentPortal = new Mock<IResidentPortalService>(MockBehavior.Loose);
        residentPortal.Setup(s => s.GetContextAsync(It.IsAny<ClaimsPrincipal>()))
            .ReturnsAsync(BuildSelectionContext(activeProperty: true));

        var controller = CreateAccesoController(residentPortal);
        var result = await controller.Index();

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal("Inicio", redirect.ControllerName);
    }

    [Fact]
    public async Task Acceso_returns_selection_view_when_force_is_requested_even_with_active_property()
    {
        var residentPortal = new Mock<IResidentPortalService>(MockBehavior.Loose);
        residentPortal.Setup(s => s.GetContextAsync(It.IsAny<ClaimsPrincipal>()))
            .ReturnsAsync(BuildSelectionContext(activeProperty: true));

        var controller = CreateAccesoController(residentPortal);
        var result = await controller.Index(force: true);

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<ResidentAccessPageViewModel>(view.Model);
        Assert.True(model.Context.HasActiveProperty);
        Assert.Equal(2, model.Context.Properties.Count);
    }

    [Fact]
    public async Task Inicio_redirects_to_acceso_when_resident_still_needs_to_choose_property()
    {
        var residentPortal = new Mock<IResidentPortalService>(MockBehavior.Loose);
        residentPortal.Setup(s => s.GetHomeAsync(It.IsAny<ClaimsPrincipal>()))
            .ReturnsAsync(new ResidentHomePageViewModel
            {
                Context = BuildSelectionContext()
            });

        var controller = CreateInicioController(residentPortal);
        var result = await controller.Index();

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal("Acceso", redirect.ControllerName);
    }

    [Fact]
    public async Task Inicio_returns_view_when_resident_has_active_property()
    {
        var residentPortal = new Mock<IResidentPortalService>(MockBehavior.Loose);
        residentPortal.Setup(s => s.GetHomeAsync(It.IsAny<ClaimsPrincipal>()))
            .ReturnsAsync(new ResidentHomePageViewModel
            {
                Context = BuildSelectionContext(activeProperty: true),
                PendingSurveys = 2
            });

        var controller = CreateInicioController(residentPortal);
        var result = await controller.Index();

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<ResidentHomePageViewModel>(view.Model);
        Assert.True(model.Context.HasActiveProperty);
        Assert.Equal(2, model.PendingSurveys);
    }
}