using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Authorization;
using Microsoft.AspNetCore.Mvc.Filters;
using Web.Services;

namespace Web.Filters;

/// <summary>
/// Exige que el usuario autenticado tenga acceso visible al menú con la Ruta indicada.
/// Los administradores (bAdministrador=true en cookie) siempre pasan.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
public sealed class RequireMenuAccessAttribute : Attribute, IAsyncAuthorizationFilter
{
    private readonly string _ruta;

    public RequireMenuAccessAttribute(string ruta)
    {
        _ruta = ruta;
    }

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        if (context.Filters.OfType<IAllowAnonymousFilter>().Any()
            || context.HttpContext.GetEndpoint()?.Metadata.GetMetadata<Microsoft.AspNetCore.Authorization.IAllowAnonymous>() is not null)
        {
            return;
        }

        var user = context.HttpContext.User;

        if (!user.Identity?.IsAuthenticated ?? true)
        {
            context.Result = new ChallengeResult();
            return;
        }

        var permService = context.HttpContext.RequestServices.GetRequiredService<IPermissionService>();

        if (!await permService.HasMenuAccessAsync(user, _ruta))
        {
            context.Result = new ForbidResult();
        }
    }
}
