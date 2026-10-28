using FluentValidation;
using GraphApi.Infrastructure.Security;
using GraphApi.Models.SGR.Casas;
using GraphApi.Services.SGR.Casas;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Controllers.SGR.Casas;

/// <summary>Gestión de casas (portal JWT) y endpoints legacy.</summary>
[ApiController]
[Authorize]
[Route("SGR/[controller]")]
[Produces("application/json")]
[SwaggerTag("Operaciones sobre Casas")]
public class CasasController : Controller
{
    private readonly ICasasService _legacy;
    private readonly ICuartaCasasService _cuarta;
    private readonly IValidator<CasaCrearRequest> _crearValidator;
    private readonly IValidator<CasaActualizarRequest> _actualizarValidator;

    public CasasController(
        ICasasService legacy,
        ICuartaCasasService cuarta,
        IValidator<CasaCrearRequest> crearValidator,
        IValidator<CasaActualizarRequest> actualizarValidator)
    {
        _legacy = legacy;
        _cuarta = cuarta;
        _crearValidator = crearValidator;
        _actualizarValidator = actualizarValidator;
    }

    [HttpGet]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(IEnumerable<CasaListItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Listar(
        [FromQuery] int? condominioId,
        [FromQuery] string? numero,
        [FromQuery] bool incluirEliminados = false,
        CancellationToken ct = default)
    {
        var list = await _cuarta.ListarCasasAsync(condominioId, numero, incluirEliminados, ct);
        return Ok(list);
    }

    [HttpGet("condominios")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(IEnumerable<CondominioItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListarCondominios(CancellationToken ct)
    {
        var list = await _cuarta.ListarCondominiosAsync(ct);
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(CasaListItemDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Obtener(int id, CancellationToken ct)
    {
        var item = await _cuarta.ObtenerCasaAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(CasaListItemDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> Crear([FromBody] CasaCrearRequest request, CancellationToken ct)
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
        var (data, code, status, detail) = await _cuarta.CrearAsync(request, adminId, correo, ct);
        if (data is null)
        {
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
        }

        return Created($"/SGR/Casas/{data.CasaId}", data);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(CasaListItemDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Actualizar(
        int id,
        [FromBody] CasaActualizarRequest request,
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
        var (data, code, status, detail) = await _cuarta.ActualizarAsync(id, request, adminId, correo, ct);
        if (data is null)
        {
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
        }

        return Ok(data);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Eliminar(int id, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
        {
            return Unauthorized();
        }

        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var (ok, code, status, detail) = await _cuarta.EliminarAsync(id, adminId, correo, ct);
        if (!ok)
        {
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
        }

        return NoContent();
    }

    [HttpGet("legacy")]
    [SwaggerOperation(Summary = "Listar Casas (legacy)")]
    public async Task<ActionResult<IEnumerable<clReadCasas>>> GetAllLegacy(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromQuery] int? casaID,
        [FromQuery] int? condominioID,
        [FromQuery] string? nombreCondominio,
        [FromQuery] string? direccionCondominio,
        [FromQuery] string? direccionCasa,
        [FromQuery] string? numeroExtCasa,
        [FromQuery] int? propietarioUsuarioID,
        [FromQuery] string? nombrePropietario,
        [FromQuery] string? correoPropietario,
        [FromQuery] string? fotoUrlPropietario,
        [FromQuery] string? telefonoPropietario,
        [FromQuery] bool? bEliminado,
        [FromQuery] string? columnNames)
    {
        var vList = await _legacy.GetCasasDynamic(
            casaID, condominioID, nombreCondominio, direccionCondominio, direccionCasa,
            numeroExtCasa, propietarioUsuarioID, nombrePropietario, correoPropietario,
            fotoUrlPropietario, telefonoPropietario, bEliminado, columnNames, nUserId, sWindowName);
        return vList.Count() == 0 ? NotFound() : Ok(vList);
    }

    [HttpPost("legacy")]
    public async Task<ActionResult<clReadCasas>> CreateLegacy(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromBody] clCreateCasas objInput)
    {
        var vCreated = await _legacy.CreateCasas(objInput, nUserId, sWindowName);
        return vCreated is null ? NoContent() : vCreated;
    }

    [HttpPatch("legacy")]
    public async Task<ActionResult<clReadCasas>> PatchLegacy(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromBody] clUpdateCasas objInput)
    {
        var vUpdated = await _legacy.UpdateCasas(objInput, nUserId, sWindowName);
        return vUpdated is null ? NotFound() : Ok(vUpdated);
    }

    [HttpDelete("legacy/{nCasasID:int}")]
    public async Task<IActionResult> DeleteLegacy(int nCasasID)
    {
        var success = await _legacy.DeleteCasas(nCasasID);
        return success ? NoContent() : NotFound();
    }
}
