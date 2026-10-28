using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using System.Security.Claims;
using Web.Controllers;
using Web.Models.Admin;
using Web.Services;
using Xunit;

namespace Web.Tests;

public sealed class HomeControllerTests
{
    // ── helpers ──────────────────────────────────────────────────────────────

    private static HomeController CreateController(
        Mock<IGraphApiBackendService> backend,
        Mock<IResidentPortalService>? residentPortal = null,
        ClaimsPrincipal? user = null)
    {
        residentPortal ??= new Mock<IResidentPortalService>(MockBehavior.Loose);
        var controller = new HomeController(NullLogger<HomeController>.Instance, backend.Object, residentPortal.Object);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = user ?? new ClaimsPrincipal(new ClaimsIdentity())
            }
        };
        return controller;
    }

    private static ClaimsPrincipal CreateUser(int usuarioId, bool isAdmin = false)
    {
        var claims = new List<Claim>
        {
            new(CotoContext.UsuarioIdClaim, usuarioId.ToString()),
            new(CotoContext.EsAdminClaim, isAdmin ? "true" : "false")
        };

        return new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"));
    }

    private static DashboardViewModel SampleDashboard() => new()
    {
        CondominiosActivos = 3,
        CasasActivas = 12,
        VisitasHoy = 5,
        PasesVigentes = 2,
        ReservasProximas = 1,
        TicketsAbiertos = 7,
        EncuestasActivas = 4,
        CuotasPendientes = 9
    };

    // ── Index ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Index_returns_view_with_dashboard_data()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        backend.Setup(s => s.GetDashboardSummaryAsync()).ReturnsAsync(SampleDashboard());

        var controller = CreateController(backend);
        var result = await controller.Index();

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<DashboardViewModel>(view.Model);
        Assert.Equal(3, model.CondominiosActivos);
        Assert.Equal(12, model.CasasActivas);
        Assert.Equal(5, model.VisitasHoy);
        Assert.Equal(7, model.TicketsAbiertos);
        Assert.Equal(9, model.CuotasPendientes);
    }

    [Fact]
    public async Task Index_returns_empty_dashboard_when_service_throws()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        backend.Setup(s => s.GetDashboardSummaryAsync())
               .ThrowsAsync(new InvalidOperationException("GraphQL errors: The maximum allowed items per page were exceeded."));

        var controller = CreateController(backend);
        var result = await controller.Index();

        // Should NOT bubble up — controller catches and returns empty view
        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<DashboardViewModel>(view.Model);
        Assert.Equal(0, model.CondominiosActivos);
        Assert.Equal(0, model.CuotasPendientes);
    }

    [Fact]
    public async Task Index_returns_empty_dashboard_when_service_returns_null_equivalent()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        backend.Setup(s => s.GetDashboardSummaryAsync()).ReturnsAsync(new DashboardViewModel());

        var controller = CreateController(backend);
        var result = await controller.Index();

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<DashboardViewModel>(view.Model);
        Assert.Equal(0, model.CondominiosActivos);
        Assert.Equal(0, model.TicketsAbiertos);
    }

    [Fact]
    public async Task Index_calls_dashboard_service_exactly_once()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        backend.Setup(s => s.GetDashboardSummaryAsync()).ReturnsAsync(SampleDashboard());

        var controller = CreateController(backend);
        await controller.Index();

        backend.Verify(s => s.GetDashboardSummaryAsync(), Times.Once);
    }

    [Fact]
    public async Task Index_returns_all_eight_counters_from_service()
    {
        var dashboard = new DashboardViewModel
        {
            CondominiosActivos = 1,
            CasasActivas       = 2,
            VisitasHoy         = 3,
            PasesVigentes      = 4,
            ReservasProximas   = 5,
            TicketsAbiertos    = 6,
            EncuestasActivas   = 7,
            CuotasPendientes   = 8
        };
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        backend.Setup(s => s.GetDashboardSummaryAsync()).ReturnsAsync(dashboard);

        var controller = CreateController(backend);
        var result = await controller.Index();

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<DashboardViewModel>(view.Model);
        Assert.Equal(1, model.CondominiosActivos);
        Assert.Equal(2, model.CasasActivas);
        Assert.Equal(3, model.VisitasHoy);
        Assert.Equal(4, model.PasesVigentes);
        Assert.Equal(5, model.ReservasProximas);
        Assert.Equal(6, model.TicketsAbiertos);
        Assert.Equal(7, model.EncuestasActivas);
        Assert.Equal(8, model.CuotasPendientes);
    }

    [Fact]
    public async Task Index_redirects_resident_users_to_resident_home()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        var residentPortal = new Mock<IResidentPortalService>(MockBehavior.Loose);
        residentPortal.Setup(s => s.HasResidentPropertiesAsync(17)).ReturnsAsync(true);

        var controller = CreateController(backend, residentPortal, CreateUser(17));
        var result = await controller.Index();

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal("Inicio", redirect.ControllerName);
        backend.Verify(s => s.GetDashboardSummaryAsync(), Times.Never);
    }
}
