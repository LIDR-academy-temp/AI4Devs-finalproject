using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Authorization;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Web.Filters;
using Web.Services;
using Xunit;

namespace Web.Tests;

public sealed class PermissionFilterTests
{
    private static ClaimsPrincipal CreateAuthenticatedUser()
        => new(new ClaimsIdentity(new[]
        {
            new Claim(CotoContext.UsuarioIdClaim, "25"),
            new Claim(CotoContext.EsAdminClaim, "false")
        }, "Test"));

    private static AuthorizationFilterContext CreateContext(
        ClaimsPrincipal user,
        Mock<IPermissionService>? permissionService = null,
        bool allowAnonymous = false)
    {
        permissionService ??= new Mock<IPermissionService>(MockBehavior.Loose);

        var services = new ServiceCollection()
            .AddScoped(_ => permissionService.Object)
            .BuildServiceProvider();

        var httpContext = new DefaultHttpContext
        {
            User = user,
            RequestServices = services
        };

        return new AuthorizationFilterContext(
            new ActionContext(httpContext, new RouteData(), new ActionDescriptor()),
            allowAnonymous
                ? new List<IFilterMetadata> { new AllowAnonymousFilter() }
                : new List<IFilterMetadata>());
    }

    [Fact]
    public async Task RequireMenuAccess_challenges_when_user_is_not_authenticated()
    {
        var attribute = new RequireMenuAccessAttribute("Gestion/Tickets");
        var context = CreateContext(new ClaimsPrincipal(new ClaimsIdentity()));

        await attribute.OnAuthorizationAsync(context);

        Assert.IsType<ChallengeResult>(context.Result);
    }

    [Fact]
    public async Task RequireMenuAccess_forbids_when_permission_is_missing()
    {
        var permissionService = new Mock<IPermissionService>(MockBehavior.Strict);
        permissionService
            .Setup(service => service.HasMenuAccessAsync(It.IsAny<ClaimsPrincipal>(), "Gestion/Tickets"))
            .ReturnsAsync(false);

        var attribute = new RequireMenuAccessAttribute("Gestion/Tickets");
        var context = CreateContext(CreateAuthenticatedUser(), permissionService);

        await attribute.OnAuthorizationAsync(context);

        Assert.IsType<ForbidResult>(context.Result);
    }

    [Fact]
    public async Task RequireMenuAccess_allows_when_permission_exists()
    {
        var permissionService = new Mock<IPermissionService>(MockBehavior.Strict);
        permissionService
            .Setup(service => service.HasMenuAccessAsync(It.IsAny<ClaimsPrincipal>(), "Gestion/Tickets"))
            .ReturnsAsync(true);

        var attribute = new RequireMenuAccessAttribute("Gestion/Tickets");
        var context = CreateContext(CreateAuthenticatedUser(), permissionService);

        await attribute.OnAuthorizationAsync(context);

        Assert.Null(context.Result);
    }

    [Fact]
    public async Task RequireMenuAccess_skips_when_allow_anonymous_is_present()
    {
        var permissionService = new Mock<IPermissionService>(MockBehavior.Strict);
        var attribute = new RequireMenuAccessAttribute("Gestion/Tickets");
        var context = CreateContext(new ClaimsPrincipal(new ClaimsIdentity()), permissionService, allowAnonymous: true);

        await attribute.OnAuthorizationAsync(context);

        Assert.Null(context.Result);
        permissionService.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task RequireAction_challenges_when_user_is_not_authenticated()
    {
        var attribute = new RequireActionAttribute("perfiles.eliminar");
        var context = CreateContext(new ClaimsPrincipal(new ClaimsIdentity()));

        await attribute.OnAuthorizationAsync(context);

        Assert.IsType<ChallengeResult>(context.Result);
    }

    [Fact]
    public async Task RequireAction_forbids_when_action_permission_is_missing()
    {
        var permissionService = new Mock<IPermissionService>(MockBehavior.Strict);
        permissionService
            .Setup(service => service.HasActionAsync(It.IsAny<ClaimsPrincipal>(), "perfiles.eliminar"))
            .ReturnsAsync(false);

        var attribute = new RequireActionAttribute("perfiles.eliminar");
        var context = CreateContext(CreateAuthenticatedUser(), permissionService);

        await attribute.OnAuthorizationAsync(context);

        Assert.IsType<ForbidResult>(context.Result);
    }

    [Fact]
    public async Task RequireAction_allows_when_action_permission_exists()
    {
        var permissionService = new Mock<IPermissionService>(MockBehavior.Strict);
        permissionService
            .Setup(service => service.HasActionAsync(It.IsAny<ClaimsPrincipal>(), "perfiles.eliminar"))
            .ReturnsAsync(true);

        var attribute = new RequireActionAttribute("perfiles.eliminar");
        var context = CreateContext(CreateAuthenticatedUser(), permissionService);

        await attribute.OnAuthorizationAsync(context);

        Assert.Null(context.Result);
    }

    [Fact]
    public async Task RequireAction_skips_when_allow_anonymous_is_present()
    {
        var permissionService = new Mock<IPermissionService>(MockBehavior.Strict);
        var attribute = new RequireActionAttribute("perfiles.eliminar");
        var context = CreateContext(new ClaimsPrincipal(new ClaimsIdentity()), permissionService, allowAnonymous: true);

        await attribute.OnAuthorizationAsync(context);

        Assert.Null(context.Result);
        permissionService.VerifyNoOtherCalls();
    }
}