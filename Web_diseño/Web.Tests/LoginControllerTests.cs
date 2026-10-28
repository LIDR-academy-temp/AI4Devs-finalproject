using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Web.Controllers.Login;
using Web.Models.Admin;
using Web.Services;
using Xunit;

namespace Web.Tests;

public sealed class LoginControllerTests
{
    private sealed class SignInCapture
    {
        public ClaimsPrincipal? Principal { get; set; }
    }

    private static LoginController CreateController(
        Mock<IGraphApiBackendService> backend,
        Mock<IResidentPortalService> residentPortal,
        Mock<IWebHostEnvironment> environment,
        Mock<IAuthenticationService> authenticationService,
        SignInCapture signInCapture)
    {
        authenticationService
            .Setup(service => service.SignInAsync(
                It.IsAny<HttpContext>(),
                CookieAuthenticationDefaults.AuthenticationScheme,
                It.IsAny<ClaimsPrincipal>(),
                It.IsAny<AuthenticationProperties?>()))
            .Callback<HttpContext, string?, ClaimsPrincipal, AuthenticationProperties?>((_, _, principal, _) => signInCapture.Principal = principal)
            .Returns(Task.CompletedTask);

        var services = new ServiceCollection()
            .AddSingleton(authenticationService.Object)
            .BuildServiceProvider();

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["WebDefaults:DefaultCondominioName"] = "CUARTA QUINIENTOS RESIDENCIAL"
            })
            .Build();

        var controller = new LoginController(
            backend.Object,
            configuration,
            Mock.Of<IEmailService>(),
            new MemoryCache(new MemoryCacheOptions()),
            residentPortal.Object,
            environment.Object);

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                RequestServices = services
            }
        };

        controller.HttpContext.Request.Scheme = "http";
        controller.HttpContext.Request.Host = new HostString("localhost", 5113);

        var urlHelper = new Mock<IUrlHelper>(MockBehavior.Loose);
        urlHelper
            .Setup(helper => helper.IsLocalUrl(It.IsAny<string>()))
            .Returns<string>(url => !string.IsNullOrWhiteSpace(url) && url.StartsWith("/", StringComparison.Ordinal));
        controller.Url = urlHelper.Object;

        return controller;
    }

    [Fact]
    public async Task DevSignIn_returns_not_found_outside_development()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        var residentPortal = new Mock<IResidentPortalService>(MockBehavior.Strict);
        var environment = new Mock<IWebHostEnvironment>(MockBehavior.Strict);
        var authenticationService = new Mock<IAuthenticationService>(MockBehavior.Strict);
        var signInCapture = new SignInCapture();

        environment.SetupGet(value => value.EnvironmentName).Returns("Production");

        var controller = CreateController(backend, residentPortal, environment, authenticationService, signInCapture);

        var result = await controller.DevSignIn("casa0@cq500.local");

        Assert.IsType<NotFoundResult>(result);
        backend.VerifyNoOtherCalls();
        residentPortal.VerifyNoOtherCalls();
        authenticationService.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task DevSignIn_signs_in_resident_and_redirects_to_access()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Strict);
        var residentPortal = new Mock<IResidentPortalService>(MockBehavior.Strict);
        var environment = new Mock<IWebHostEnvironment>(MockBehavior.Strict);
        var authenticationService = new Mock<IAuthenticationService>(MockBehavior.Strict);
        var signInCapture = new SignInCapture();

        environment.SetupGet(value => value.EnvironmentName).Returns("Development");
        backend.Setup(service => service.GetCondominiosAsync()).ReturnsAsync(new[]
        {
            new CondominioFormViewModel
            {
                CondominioID = 1,
                NombreCondominio = "CUARTA QUINIENTOS RESIDENCIAL",
                DireccionCondominio = "CUARTA PONIENTE 500"
            }
        });
        backend.Setup(service => service.GetPerfilByCorreoAsync("casa0@cq500.local")).ReturnsAsync(new PerfilViewModel
        {
            UsuarioID = 4,
            PerfilID = 3,
            NombreUsuario = "Residente Validacion",
            CorreoUsuario = "casa0@cq500.local",
            bAdministrador = false
        });
        var controller = CreateController(backend, residentPortal, environment, authenticationService, signInCapture);

        var result = await controller.DevSignIn("  CASA0@CQ500.LOCAL  ");

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal("Acceso", redirect.ControllerName);

        Assert.NotNull(signInCapture.Principal);
        Assert.Equal("4", signInCapture.Principal!.FindFirst(CotoContext.UsuarioIdClaim)?.Value);
        Assert.Equal("3", signInCapture.Principal.FindFirst(CotoContext.PerfilIdClaim)?.Value);
        Assert.Equal("false", signInCapture.Principal.FindFirst(CotoContext.EsAdminClaim)?.Value);
        Assert.Equal("1", signInCapture.Principal.FindFirst(CotoContext.SelectedCondominioIdClaim)?.Value);
        Assert.Null(signInCapture.Principal.FindFirst("backend_token"));

        authenticationService.Verify(service => service.SignInAsync(
            It.IsAny<HttpContext>(),
            CookieAuthenticationDefaults.AuthenticationScheme,
            It.IsAny<ClaimsPrincipal>(),
            It.IsAny<AuthenticationProperties?>()), Times.Once);
        residentPortal.Verify(service => service.HasResidentPropertiesAsync(It.IsAny<int>()), Times.Never);
    }
}