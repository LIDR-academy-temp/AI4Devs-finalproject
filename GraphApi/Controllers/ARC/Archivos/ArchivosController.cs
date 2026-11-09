using GraphApi.Infrastructure.Security;
using GraphApi.Models.ARC.Archivos;
using GraphApi.Models.ARC.CuartaArchivos;
using GraphApi.Services.ARC.Archivos;
using GraphApi.Services.ARC.CuartaArchivos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Controllers.ARC.Archivos;

[ApiController]
[Authorize]
[Route("ARC/[controller]")]
[Produces("application/json")]
[SwaggerTag("Operaciones sobre Archivos")]
public class ArchivosController : Controller
{
    private readonly IArchivosService _legacy;
    private readonly ICuartaArchivosService _cuarta;

    public ArchivosController(IArchivosService legacy, ICuartaArchivosService cuarta)
    {
        _legacy = legacy;
        _cuarta = cuarta;
    }

    // ── Cuarta endpoints ────────────────────────────────────────────────────

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<ArchivoListItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Listar([FromQuery] string? tipoArchivo, CancellationToken ct)
    {
        var list = await _cuarta.ListarAsync(tipoArchivo, ct);
        return Ok(list);
    }

    [HttpGet("{id:int}/descargar")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Descargar(int id, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var usuarioId))
            return Unauthorized();

        var correo = JwtUserContext.GetCorreo(User) ?? "";
        var ua = Request.Headers.UserAgent.ToString();
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();

        var (stream, mime, nombre, code, status, detail) =
            await _cuarta.DescargarAsync(id, usuarioId, correo, ua, ip, ct);

        if (stream is null)
        {
            return Problem(
                title: "Error al descargar",
                detail: detail,
                statusCode: status,
                extensions: new Dictionary<string, object?> { ["code"] = code });
        }

        return File(stream, mime!, nombre);
    }

    [HttpPost]
    [Authorize(Policy = "SoloAdministrador")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(ArchivoListItemDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> Subir([FromForm] IFormFile archivo, [FromForm] SubirArchivoRequest request, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
            return Unauthorized();
        var correo = JwtUserContext.GetCorreo(User) ?? "";

        var (data, code, status, detail) = await _cuarta.SubirAsync(archivo, request, adminId, correo, ct);
        if (data is null)
        {
            return Problem(
                title: "Error al subir archivo",
                detail: detail,
                statusCode: status,
                extensions: new Dictionary<string, object?> { ["code"] = code });
        }

        return CreatedAtAction(nameof(Listar), null, data);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(ArchivoListItemDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Actualizar(int id, [FromBody] ActualizarArchivoRequest request, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
            return Unauthorized();
        var correo = JwtUserContext.GetCorreo(User) ?? "";

        var (data, code, status, detail) = await _cuarta.ActualizarAsync(id, request, adminId, correo, ct);
        if (data is null)
        {
            return Problem(
                title: "Error al actualizar archivo",
                detail: detail,
                statusCode: status,
                extensions: new Dictionary<string, object?> { ["code"] = code });
        }

        return Ok(data);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Eliminar(int id, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
            return Unauthorized();
        var correo = JwtUserContext.GetCorreo(User) ?? "";

        var (ok, code, status, detail) = await _cuarta.EliminarAsync(id, adminId, correo, ct);
        if (!ok)
        {
            return Problem(
                title: "No se pudo eliminar",
                detail: detail,
                statusCode: status,
                extensions: new Dictionary<string, object?> { ["code"] = code });
        }

        return NoContent();
    }

    // ── Legacy endpoints ─────────────────────────────────────────────────────

    [HttpGet("legacy")]
    [SwaggerOperation(Summary = "Listar Archivos (legacy)", Description = "Versión anterior del endpoint.")]
    [ProducesResponseType(typeof(IEnumerable<clReadArchivos>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<clReadArchivos>>> LegacyGetAll(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromQuery] int? archivoID,
        [FromQuery] string? nombre,
        [FromQuery] string? ruta,
        [FromQuery] int? tipoArchivoID,
        [FromQuery] string? tipoArchivo,
        [FromQuery] bool? esPrivado,
        [FromQuery] bool? bEliminado,
        [FromQuery] string? columnNames)
    {
        var vList = await _legacy.GetArchivosDynamic(archivoID, nombre, ruta, tipoArchivoID, tipoArchivo, esPrivado, bEliminado, columnNames, nUserId, sWindowName);
        return vList.Count() == 0 ? NotFound() : Ok(vList);
    }

    [HttpPost("legacy")]
    [SwaggerOperation(Summary = "Crear Archivo (legacy)")]
    [ProducesResponseType(typeof(clReadArchivos), StatusCodes.Status201Created)]
    public async Task<ActionResult<clReadArchivos>> LegacyCreate(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromBody] clCreateArchivos objInput)
    {
        var vCreated = await _legacy.CreateArchivos(objInput, nUserId, sWindowName);
        return vCreated is null ? NoContent() : (ActionResult<clReadArchivos>)vCreated;
    }

    [HttpPatch("legacy")]
    [SwaggerOperation(Summary = "Actualizar Archivo (legacy)")]
    [ProducesResponseType(typeof(clReadArchivos), StatusCodes.Status200OK)]
    public async Task<ActionResult<clReadArchivos>> LegacyPatch(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromBody] clUpdateArchivos objInput)
    {
        var vUpdated = await _legacy.UpdateArchivos(objInput, nUserId, sWindowName);
        return vUpdated is null ? NotFound() : Ok(vUpdated);
    }

    [HttpDelete("legacy/{nArchivosID:int}")]
    [SwaggerOperation(Summary = "Eliminar Archivo (legacy)")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> LegacyDelete(int nArchivosID)
    {
        var success = await _legacy.DeleteArchivos(nArchivosID);
        return success ? NoContent() : NotFound();
    }
}
