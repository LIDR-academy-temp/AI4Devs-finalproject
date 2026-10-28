using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GraphApi.Models.JNT.CuartaJuntas;
using GraphApi.Services.JNT.CuartaJuntas;
// Legacy
using GraphApi.Services.JNT.Juntas;
using Swashbuckle.AspNetCore.Annotations;
using System.Security.Claims;

namespace GraphApi.Controllers.JNT.Juntas;

[ApiController]
[Authorize]
[Route("JNT/[controller]")]
[Produces("application/json")]
[SwaggerTag("Juntas de condóminos")]
public class JuntasController(
    ICuartaJuntasService cuarta,
    IJuntasService legacy) : ControllerBase
{
    // ── Cuarta ───────────────────────────────────────────────────────────────

    /// <summary>Lista todas las juntas activas, desc por fecha.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<JuntaListItemDto>), 200)]
    public async Task<IActionResult> Listar(CancellationToken ct)
    {
        var list = await cuarta.ListarAsync(ct);
        return Ok(list);
    }

    /// <summary>Detalle de una junta incluyendo acuerdos y archivos.</summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(JuntaDetalleDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Detalle(int id, CancellationToken ct)
    {
        var junta = await cuarta.ObtenerAsync(id, ct);
        return junta is null ? NotFound() : Ok(junta);
    }

    /// <summary>Crea una junta (Admin). Opcionalmente incluye el detalle/acta inicial.</summary>
    [HttpPost]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(JuntaDetalleDto), 201)]
    [ProducesResponseType(422)]
    public async Task<IActionResult> Crear([FromBody] JuntaCrearRequest request, CancellationToken ct)
    {
        var correo = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("correo") ?? "";
        var adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

        var (junta, code, status, detail) = await cuarta.CrearAsync(request, correo, adminId, ct);
        if (junta is null)
            return Problem(detail: detail, statusCode: status, title: code);

        return CreatedAtAction(nameof(Detalle), new { id = junta.JuntaId }, junta);
    }

    /// <summary>Actualiza una junta y/o su detalle (Admin).</summary>
    [HttpPut("{id:int}")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(204)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Actualizar(int id, [FromBody] JuntaActualizarRequest request, CancellationToken ct)
    {
        var correo = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("correo") ?? "";
        var adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

        var (ok, code, status, detail) = await cuarta.ActualizarAsync(id, request, correo, adminId, ct);
        if (!ok) return Problem(detail: detail, statusCode: status, title: code);
        return NoContent();
    }

    /// <summary>Soft-delete de una junta (Admin).</summary>
    [HttpDelete("{id:int}")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(204)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Eliminar(int id, CancellationToken ct)
    {
        var correo = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("correo") ?? "";
        var adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

        var (ok, code, status, detail) = await cuarta.EliminarAsync(id, correo, adminId, ct);
        if (!ok) return Problem(detail: detail, statusCode: status, title: code);
        return NoContent();
    }

    // ── Legacy ───────────────────────────────────────────────────────────────

    [HttpGet("legacy")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> LegacyGet(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromQuery] int? juntaID, [FromQuery] string? titulo, [FromQuery] string? descripcion,
        [FromQuery] DateTime? fechaProgramada, [FromQuery] string? ubicacion,
        [FromQuery] bool? bActivo, [FromQuery] bool? bEliminado, [FromQuery] string? columnNames)
    {
        var list = await legacy.GetJuntasDynamic(juntaID, titulo, descripcion, fechaProgramada, ubicacion, bActivo, bEliminado, columnNames, nUserId, sWindowName);
        return list.Any() ? Ok(list) : NotFound();
    }

    [HttpPost("legacy")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> LegacyCreate(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromBody] GraphApi.Models.JNT.Juntas.clCreateJuntas objInput)
    {
        var created = await legacy.CreateJuntas(objInput, nUserId, sWindowName);
        return created is null ? NoContent() : Ok(created);
    }

    [HttpPatch("legacy")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> LegacyPatch(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromBody] GraphApi.Models.JNT.Juntas.clUpdateJuntas objInput)
    {
        var updated = await legacy.UpdateJuntas(objInput, nUserId, sWindowName);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("legacy/{id:int}")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> LegacyDelete(int id)
    {
        return await legacy.DeleteJuntas(id) ? NoContent() : NotFound();
    }
}
