using GraphApi.Infrastructure.Security;
using GraphApi.Models.SGR.Navegacion;
using GraphApi.Models.SGR.Perfiles;
using GraphApi.Services.SGR.Navegacion;
using GraphApi.Services.SGR.Perfiles;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Controllers.SGR.Perfiles;

/// <summary>Gestión de Perfiles: legacy (headers) y permisos menú JWT.</summary>
[ApiController]
[Authorize]
[Route("SGR/[controller]")]
[Produces("application/json")]
[SwaggerTag("Operaciones sobre Perfiles")]
public class PerfilesController : Controller
{
    private readonly IPerfilesService _objService;
    private readonly ICuartaNavegacionService _cuarta;

    public PerfilesController(IPerfilesService objService, ICuartaNavegacionService cuarta)
    {
        _objService = objService;
        _cuarta = cuarta;
    }

    #region Cuarta JWT — permisos menú

    [HttpGet("admin")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(IReadOnlyList<PerfilAdminListItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListarPerfilesAdmin(CancellationToken ct)
    {
        var list = await _cuarta.ListarPerfilesAdminAsync(ct);
        return Ok(list);
    }

    [HttpPost("admin")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(PerfilAdminListItemDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> CrearPerfilAdmin([FromBody] PerfilAdminUpsertRequest request, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
            return Unauthorized();

        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var (data, code, status, detail) = await _cuarta.CrearPerfilAdminAsync(request, adminId, correo, ct);
        if (data is null)
        {
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
        }

        return StatusCode(status, data);
    }

    [HttpPut("{id:int}/admin")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(PerfilAdminListItemDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> ActualizarPerfilAdmin(int id, [FromBody] PerfilAdminUpsertRequest request, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
            return Unauthorized();

        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var (data, code, status, detail) = await _cuarta.ActualizarPerfilAdminAsync(id, request, adminId, correo, ct);
        if (data is null)
        {
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
        }

        return Ok(data);
    }

    [HttpDelete("{id:int}/admin")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> EliminarPerfilAdmin(int id, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
            return Unauthorized();

        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var (ok, code, status, detail) = await _cuarta.EliminarPerfilAdminAsync(id, adminId, correo, ct);
        if (!ok)
        {
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
        }

        return NoContent();
    }

    [HttpGet("{id:int}/permisos-menus")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(IReadOnlyList<PerfilMenuPermisoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ObtenerPermisosMenus(int id, CancellationToken ct)
    {
        var list = await _cuarta.ListarPermisosMenusAsync(id, ct);
        return list is null ? NotFound() : Ok(list);
    }

    [HttpPut("{id:int}/permisos-menus")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(IReadOnlyList<PerfilMenuPermisoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ActualizarPermisosMenus(
        int id,
        [FromBody] PerfilMenuAsignacionRequest request,
        CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
        {
            return Unauthorized();
        }

        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var (data, code, status, detail) = await _cuarta.ActualizarPermisosMenusAsync(id, request, adminId, correo, ct);
        if (data is null)
        {
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
        }

        return Ok(data);
    }

    #endregion

    [HttpGet]
    [SwaggerOperation(Summary = "Listar Perfiles", Description = "Devuelve Perfiles aplicando filtros opcionales.")]
    [ProducesResponseType(typeof(IEnumerable<clReadPerfiles>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<clReadPerfiles>>> GetAll(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromQuery] int? perfilID,
        [FromQuery] string? perfil,
        [FromQuery] string? descripcion,
        [FromQuery] bool? bAdministrador,
        [FromQuery] bool? bEliminado,
        [FromQuery] int? usuariosAsignados,
        [FromQuery] string? columnNames)
    {
        var vList = await _objService.GetPerfilesDynamic(
            perfilID, perfil, descripcion, bAdministrador, bEliminado, usuariosAsignados, columnNames, nUserId, sWindowName);
        return vList.Count() == 0 ? NotFound() : Ok(vList);
    }

    [HttpPost]
    [SwaggerOperation(Summary = "Crear Perfiles", Description = "Inserta un nuevo Perfile en la base de datos.")]
    [ProducesResponseType(typeof(clReadPerfiles), StatusCodes.Status201Created)]
    public async Task<ActionResult<clReadPerfiles>> Create(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromBody] clCreatePerfiles objInput)
    {
        var vCreated = await _objService.CreatePerfiles(objInput, nUserId, sWindowName);
        return vCreated is null ? NoContent() : vCreated;
    }

    [HttpPatch]
    [SwaggerOperation(Summary = "Actualizar Perfiles", Description = "Actualiza uno o varios campos de Perfile existente.")]
    [ProducesResponseType(typeof(clReadPerfiles), StatusCodes.Status200OK)]
    public async Task<ActionResult<clReadPerfiles>> Patch(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromBody] clUpdatePerfiles objInput)
    {
        var vUpdated = await _objService.UpdatePerfiles(objInput, nUserId, sWindowName);
        return vUpdated is null ? NotFound() : Ok(vUpdated);
    }

    [HttpDelete("{nPerfilesID:int}")]
    [SwaggerOperation(Summary = "Eliminar Perfile", Description = "Borra un Perfile si existe.")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(int nPerfilesID)
    {
        var success = await _objService.DeletePerfiles(nPerfilesID);
        return success ? NoContent() : NotFound();
    }
}
