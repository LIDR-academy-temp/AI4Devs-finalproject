using System.Text.Json;
using FluentValidation;
using GraphApi.Infrastructure.Security;
using GraphApi.Models.ANM.Anuncios;
using GraphApi.Services.ANM.Anuncios;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Controllers.ANM.Anuncios;

[ApiController]
[Authorize]
[Route("ANM/[controller]")]
[Produces("application/json")]
[SwaggerTag("Operaciones sobre Anuncios")]
public class AnunciosController : Controller
{
    private readonly IAnunciosService _legacy;
    private readonly ICuartaAnunciosService _cuarta;
    private readonly IValidator<AnuncioCrearRequest> _crearValidator;
    private readonly IValidator<AnuncioActualizarRequest> _actualizarValidator;

    public AnunciosController(
        IAnunciosService legacy,
        ICuartaAnunciosService cuarta,
        IValidator<AnuncioCrearRequest> crearValidator,
        IValidator<AnuncioActualizarRequest> actualizarValidator)
    {
        _legacy = legacy;
        _cuarta = cuarta;
        _crearValidator = crearValidator;
        _actualizarValidator = actualizarValidator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<AnuncioListItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Listar(
        [FromQuery] bool incluirNoVigentes = false,
        CancellationToken ct = default)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var usuarioId))
        {
            return Unauthorized();
        }

        if (incluirNoVigentes && !User.IsInRole("Administrador"))
        {
            incluirNoVigentes = false;
        }

        var list = await _cuarta.ListarAsync(usuarioId, incluirNoVigentes, ct);
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(AnuncioListItemDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Obtener(int id, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var usuarioId))
        {
            return Unauthorized();
        }

        var soloVigentes = !User.IsInRole("Administrador");
        var item = await _cuarta.ObtenerAsync(id, usuarioId, soloVigentes, ct);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPatch("{id:int}/visto")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> MarcarVisto(int id, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var usuarioId))
        {
            return Unauthorized();
        }

        var correo = JwtUserContext.GetCorreo(User) ?? "usuario";
        var (ok, code, status, detail) = await _cuarta.MarcarVistoAsync(id, usuarioId, correo, ct);
        if (!ok)
        {
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
        }

        return NoContent();
    }

    [HttpPost]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(AnuncioListItemDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> Crear([FromBody] AnuncioCrearRequest request, CancellationToken ct)
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

        return Created($"/ANM/Anuncios/{data.AnuncioId}", data);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(AnuncioListItemDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Actualizar(int id, [FromBody] JsonElement body, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
        {
            return Unauthorized();
        }

        var request = JsonSerializer.Deserialize<AnuncioActualizarRequest>(body.GetRawText())
            ?? new AnuncioActualizarRequest();
        request.VigenteHastaEspecificado = body.ValueKind == JsonValueKind.Object
            && body.TryGetProperty("vigenteHasta", out _);

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
    [SwaggerOperation(Summary = "Listar Anuncios (legacy)")]
    public async Task<ActionResult<IEnumerable<clReadAnuncios>>> GetAllLegacy(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromQuery] int? anuncioID,
        [FromQuery] string? titulo,
        [FromQuery] string? contenido,
        [FromQuery] DateTime? fechaPublicacion,
        [FromQuery] DateTime? vigenteHasta,
        [FromQuery] int? tipoAnuncioID,
        [FromQuery] string? tipoAnuncio,
        [FromQuery] bool? bEliminado,
        [FromQuery] string? columnNames)
    {
        var vList = await _legacy.GetAnunciosDynamic(
            anuncioID, titulo, contenido, fechaPublicacion, vigenteHasta,
            tipoAnuncioID, tipoAnuncio, bEliminado, columnNames, nUserId, sWindowName);
        return vList.Count() == 0 ? NotFound() : Ok(vList);
    }

    [HttpPost("legacy")]
    public async Task<ActionResult<clReadAnuncios>> CreateLegacy(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromBody] clCreateAnuncios objInput)
    {
        var vCreated = await _legacy.CreateAnuncios(objInput, nUserId, sWindowName);
        return vCreated is null ? NoContent() : vCreated;
    }

    [HttpPatch("legacy")]
    public async Task<ActionResult<clReadAnuncios>> PatchLegacy(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromBody] clUpdateAnuncios objInput)
    {
        var vUpdated = await _legacy.UpdateAnuncios(objInput, nUserId, sWindowName);
        return vUpdated is null ? NotFound() : Ok(vUpdated);
    }

    [HttpDelete("legacy/{nAnunciosID:int}")]
    public async Task<IActionResult> DeleteLegacy(int nAnunciosID)
    {
        var success = await _legacy.DeleteAnuncios(nAnunciosID);
        return success ? NoContent() : NotFound();
    }
}
