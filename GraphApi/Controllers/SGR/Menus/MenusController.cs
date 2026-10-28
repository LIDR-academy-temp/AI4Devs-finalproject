using FluentValidation;
using GraphApi.Infrastructure.Security;
using GraphApi.Models.SGR.Menus;
using GraphApi.Models.SGR.Navegacion;
using GraphApi.Services.SGR.Menus;
using GraphApi.Services.SGR.Navegacion;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Controllers.SGR.Menus;

/// <summary>Gestión de Menus: legacy (headers) y admin JWT.</summary>
[ApiController]
[Authorize]
[Route("SGR/[controller]")]
[Produces("application/json")]
[SwaggerTag("Operaciones sobre Menus")]
public class MenusController : Controller
{
    private readonly IMenusService _objService;
    private readonly ICuartaNavegacionService _cuarta;
    private readonly IValidator<MenuCrearRequest> _crearValidator;
    private readonly IValidator<MenuActualizarRequest> _actualizarValidator;

    public MenusController(
        IMenusService objService,
        ICuartaNavegacionService cuarta,
        IValidator<MenuCrearRequest> crearValidator,
        IValidator<MenuActualizarRequest> actualizarValidator)
    {
        _objService = objService;
        _cuarta = cuarta;
        _crearValidator = crearValidator;
        _actualizarValidator = actualizarValidator;
    }

    #region Cuarta JWT — admin menús

    [HttpGet("admin")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(IEnumerable<MenuAdminListItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListarAdmin(
        [FromQuery] bool incluirEliminados = false,
        CancellationToken ct = default)
    {
        var list = await _cuarta.ListarMenusAdminAsync(incluirEliminados, ct);
        return Ok(list);
    }

    [HttpGet("admin/{id:int}")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(MenuAdminListItemDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> ObtenerAdmin(int id, CancellationToken ct)
    {
        var item = await _cuarta.ObtenerMenuAdminAsync(id, ct);
        return item is null || item.Eliminado ? NotFound() : Ok(item);
    }

    [HttpPost("admin")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(MenuAdminListItemDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> CrearAdmin([FromBody] MenuCrearRequest request, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
        {
            return Unauthorized();
        }

        var validation = await _crearValidator.ValidateAsync(request, ct);
        if (!validation.IsValid)
        {
            return ValidationProblem(new ValidationProblemDetails(
                validation.Errors.GroupBy(e => e.PropertyName)
                    .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray())));
        }

        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var (data, code, status, detail) = await _cuarta.CrearMenuAsync(request, adminId, correo, ct);
        if (data is null)
        {
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
        }

        return Created($"/SGR/Menus/admin/{data.MenuId}", data);
    }

    [HttpPut("admin/{id:int}")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(MenuAdminListItemDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> ActualizarAdmin(
        int id,
        [FromBody] MenuActualizarRequest request,
        CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
        {
            return Unauthorized();
        }

        var validation = await _actualizarValidator.ValidateAsync(request, ct);
        if (!validation.IsValid)
        {
            return ValidationProblem(new ValidationProblemDetails(
                validation.Errors.GroupBy(e => e.PropertyName)
                    .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray())));
        }

        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var (data, code, status, detail) = await _cuarta.ActualizarMenuAsync(id, request, adminId, correo, ct);
        if (data is null)
        {
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
        }

        return Ok(data);
    }

    [HttpDelete("admin/{id:int}")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> EliminarAdmin(int id, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
        {
            return Unauthorized();
        }

        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var (ok, code, status, detail) = await _cuarta.EliminarMenuAsync(id, adminId, correo, ct);
        if (!ok)
        {
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
        }

        return NoContent();
    }

    #endregion

    /// <summary>Obtiene todos los Menus, con filtros opcionales (legacy).</summary>
    [HttpGet]
    [SwaggerOperation(Summary = "Listar Menus", Description = "Devuelve Menus aplicando filtros opcionales.")]
    [ProducesResponseType(typeof(IEnumerable<clReadMenus>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<clReadMenus>>> GetAll(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromQuery] int? menuID,
        [FromQuery] string? tituloMenu,
        [FromQuery] string? ruta,
        [FromQuery] string? icono,
        [FromQuery] int? orden,
        [FromQuery] int? padreMenuID,
        [FromQuery] bool? bEliminado,
        [FromQuery] string? columnNames)
    {
        var vList = await _objService.GetMenusDynamic(
            menuID, tituloMenu, ruta, icono, orden, padreMenuID, bEliminado, columnNames, nUserId, sWindowName);
        return vList.Count() == 0 ? NotFound() : Ok(vList);
    }

    [HttpPost]
    [SwaggerOperation(Summary = "Crear Menus", Description = "Inserta un nuevo Menu en la base de datos.")]
    [ProducesResponseType(typeof(clReadMenus), StatusCodes.Status201Created)]
    public async Task<ActionResult<clReadMenus>> Create(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromBody] clCreateMenus objInput)
    {
        var vCreated = await _objService.CreateMenus(objInput, nUserId, sWindowName);
        return vCreated is null ? NoContent() : vCreated;
    }

    [HttpPatch]
    [SwaggerOperation(Summary = "Actualizar Menus", Description = "Actualiza uno o varios campos de Menu existente.")]
    [ProducesResponseType(typeof(clReadMenus), StatusCodes.Status200OK)]
    public async Task<ActionResult<clReadMenus>> Patch(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromBody] clUpdateMenus objInput)
    {
        var vUpdated = await _objService.UpdateMenus(objInput, nUserId, sWindowName);
        return vUpdated is null ? NotFound() : Ok(vUpdated);
    }

    [HttpDelete("{nMenusID:int}")]
    [SwaggerOperation(Summary = "Eliminar Menu", Description = "Borra un Menu si existe.")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(int nMenusID)
    {
        var success = await _objService.DeleteMenus(nMenusID);
        return success ? NoContent() : NotFound();
    }
}
