using GraphApi.Infrastructure.Security;
using GraphApi.Models.SGR.Navegacion;
using GraphApi.Services.SGR.Navegacion;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Controllers.SGR.Navegacion;

/// <summary>Menú jerárquico JWT por perfil.</summary>
[ApiController]
[Authorize]
[Route("SGR/[controller]")]
[Produces("application/json")]
[SwaggerTag("Navegación del portal")]
public class NavegacionController : Controller
{
    private readonly ICuartaNavegacionService _navegacion;

    public NavegacionController(ICuartaNavegacionService navegacion) => _navegacion = navegacion;

    /// <summary>Menús visibles del usuario autenticado (árbol).</summary>
    [HttpGet("menus")]
    [ProducesResponseType(typeof(IReadOnlyList<MenuNodoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ObtenerMenus(CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out _))
        {
            return Unauthorized();
        }

        var perfil = JwtUserContext.GetPerfil(User);
        var (data, code, status, detail) = await _navegacion.ObtenerMenusUsuarioAsync(perfil, ct);
        if (data is null)
        {
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
        }

        return Ok(data);
    }
}
