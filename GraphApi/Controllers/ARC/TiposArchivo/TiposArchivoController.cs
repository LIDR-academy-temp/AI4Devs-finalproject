using GraphApi.Infrastructure.Security;
using GraphApi.Models.ARC.CuartaArchivos;
using GraphApi.Models.ARC.TiposArchivo;
using GraphApi.Services.ARC.CuartaArchivos;
using GraphApi.Services.ARC.TiposArchivo;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Controllers.ARC.TiposArchivo;

[ApiController]
[Authorize]
[Route("ARC/[controller]")]
[Produces("application/json")]
[SwaggerTag("Operaciones sobre TiposArchivos")]
public class TiposArchivoController : Controller
{
    private readonly ITiposArchivoService _legacy;
    private readonly ICuartaArchivosService _cuarta;

    public TiposArchivoController(ITiposArchivoService legacy, ICuartaArchivosService cuarta)
    {
        _legacy = legacy;
        _cuarta = cuarta;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<TipoArchivoItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Listar(CancellationToken ct)
    {
        var list = await _cuarta.ListarTiposAsync(ct);
        return Ok(list);
    }

    [HttpPost]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(TipoArchivoItemDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> Crear([FromBody] TipoArchivoUpsertRequest request, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
            return Unauthorized();
        var correo = JwtUserContext.GetCorreo(User) ?? "";

        var (data, code, status, detail) = await _cuarta.CrearTipoAsync(request.TipoArchivo, adminId, correo, ct);
        if (data is null)
        {
            return Problem(
                title: "Error al crear tipo",
                detail: detail,
                statusCode: status,
                extensions: new Dictionary<string, object?> { ["code"] = code });
        }

        return StatusCode(status, data);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(TipoArchivoItemDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Actualizar(int id, [FromBody] TipoArchivoUpsertRequest request, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
            return Unauthorized();
        var correo = JwtUserContext.GetCorreo(User) ?? "";

        var (data, code, status, detail) = await _cuarta.ActualizarTipoAsync(id, request.TipoArchivo, adminId, correo, ct);
        if (data is null)
        {
            return Problem(
                title: "Error al actualizar tipo",
                detail: detail,
                statusCode: status,
                extensions: new Dictionary<string, object?> { ["code"] = code });
        }

        return Ok(data);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Eliminar(int id, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
            return Unauthorized();
        var correo = JwtUserContext.GetCorreo(User) ?? "";

        var (ok, code, status, detail) = await _cuarta.EliminarTipoAsync(id, adminId, correo, ct);
        if (!ok)
        {
            return Problem(
                title: "Error al eliminar tipo",
                detail: detail,
                statusCode: status,
                extensions: new Dictionary<string, object?> { ["code"] = code });
        }

        return NoContent();
    }

    [HttpGet("legacy")]
    [SwaggerOperation(Summary = "Listar TiposArchivos (legacy)")]
    [ProducesResponseType(typeof(IEnumerable<clReadTiposArchivo>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<clReadTiposArchivo>>> GetAllLegacy(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromQuery] int? tipoArchivoID,
        [FromQuery] string? tipoArchivo,
        [FromQuery] bool? bEliminado,
        [FromQuery] string? columnNames)
    {
        var vList = await _legacy.GetTiposArchivosDynamic(tipoArchivoID, tipoArchivo, bEliminado, columnNames, nUserId, sWindowName);
        return vList.Count() == 0 ? NotFound() : Ok(vList);
    }

    [HttpPost("legacy")]
    [SwaggerOperation(Summary = "Crear TiposArchivo (legacy)")]
    public async Task<ActionResult<clReadTiposArchivo>> CreateLegacy(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromBody] clCreateTiposArchivo objInput)
    {
        var vCreated = await _legacy.CreateTiposArchivo(objInput, nUserId, sWindowName);
        return vCreated is null ? NoContent() : (ActionResult<clReadTiposArchivo>)vCreated;
    }

    [HttpPatch("legacy")]
    [SwaggerOperation(Summary = "Actualizar TiposArchivo (legacy)")]
    public async Task<ActionResult<clReadTiposArchivo>> PatchLegacy(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromBody] clUpdateTiposArchivo objInput)
    {
        var vUpdated = await _legacy.UpdateTiposArchivo(objInput, nUserId, sWindowName);
        return vUpdated is null ? NotFound() : Ok(vUpdated);
    }

    [HttpDelete("legacy/{nTiposArchivoID:int}")]
    [SwaggerOperation(Summary = "Eliminar TiposArchivo (legacy)")]
    public async Task<IActionResult> DeleteLegacy(int nTiposArchivoID)
    {
        var success = await _legacy.DeleteTiposArchivo(nTiposArchivoID);
        return success ? NoContent() : NotFound();
    }
}
