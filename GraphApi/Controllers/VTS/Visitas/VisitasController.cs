using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GraphApi.Models.VTS.CuartaVisitas;
using GraphApi.Services.VTS.CuartaVisitas;
using GraphApi.Services.VTS.Visitas;
using Swashbuckle.AspNetCore.Annotations;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using GraphApi.Infrastructure.Security;

namespace GraphApi.Controllers.VTS.Visitas;

[ApiController]
[Authorize]
[Route("VTS/[controller]")]
[Produces("application/json")]
[SwaggerTag("Visitas y control de acceso")]
public class VisitasController(
    ICuartaVisitasService cuarta,
    IVisitasService legacy) : ControllerBase
{
    // ── Cuarta ───────────────────────────────────────────────────────────────

    /// <summary>Lista visitas con filtros opcionales (Admin).</summary>
    [HttpGet]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(IReadOnlyList<VisitaListItemDto>), 200)]
    public async Task<IActionResult> Listar(
        [FromQuery] int? casaId,
        [FromQuery] DateTime? desde,
        [FromQuery] DateTime? hasta,
        CancellationToken ct)
    {
        var list = await cuarta.ListarVisitasAsync(casaId, desde, hasta, ct);
        return Ok(list);
    }

    /// <summary>Registra la entrada de un visitante (Guardia o Admin).</summary>
    [HttpPost]
    [ProducesResponseType(typeof(VisitaListItemDto), 201)]
    [ProducesResponseType(422)]
    public async Task<IActionResult> RegistrarEntrada([FromBody] RegistrarVisitaRequest request, CancellationToken ct)
    {
        var correo = JwtUserContext.GetCorreo(User) ?? "";
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

        var (visita, code, status, detail) = await cuarta.RegistrarEntradaAsync(request, correo, userId, ct);
        if (visita is null) return Problem(detail: detail, statusCode: status, title: code);

        return StatusCode(201, visita);
    }

    /// <summary>Registra la salida de un visitante (Guardia o Admin).</summary>
    [HttpPatch("{id:int}/salida")]
    [ProducesResponseType(204)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> RegistrarSalida(int id, CancellationToken ct)
    {
        var correo = JwtUserContext.GetCorreo(User) ?? "";
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

        var (ok, code, status, detail) = await cuarta.RegistrarSalidaAsync(id, correo, userId, ct);
        if (!ok) return Problem(detail: detail, statusCode: status, title: code);
        return NoContent();
    }

    // ── Legacy ───────────────────────────────────────────────────────────────
    [HttpGet("legacy")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> LegacyGet(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromQuery] int? visitaID, [FromQuery] string? visitanteNombre,
        [FromQuery] int? usuarioVisitadoID, [FromQuery] int? casaID,
        [FromQuery] int? tipoIdentificacionID, [FromQuery] string? numeroIdentificacion,
        [FromQuery] string? rutaDocumento, [FromQuery] DateTime? fechaEntrada,
        [FromQuery] DateTime? fechaSalida, [FromQuery] bool? autorizado,
        [FromQuery] bool? bEliminado, [FromQuery] string? columnNames)
    {
        var list = await legacy.GetVisitasDynamic(visitaID, visitanteNombre, usuarioVisitadoID, casaID, tipoIdentificacionID, numeroIdentificacion, rutaDocumento, fechaEntrada, fechaSalida, autorizado, bEliminado, columnNames, nUserId, sWindowName);
        return list.Any() ? Ok(list) : NotFound();
    }

    [HttpPost("legacy")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> LegacyCreate(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromBody] GraphApi.Models.VTS.Visitas.clCreateVisitas objInput)
    {
        var created = await legacy.CreateVisitas(objInput, nUserId, sWindowName);
        return created is null ? NoContent() : Ok(created);
    }

    [HttpPatch("legacy")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> LegacyPatch(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromBody] GraphApi.Models.VTS.Visitas.clUpdateVisitas objInput)
    {
        var updated = await legacy.UpdateVisitas(objInput, nUserId, sWindowName);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("legacy/{id:int}")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> LegacyDelete(int id)
        => await legacy.DeleteVisitas(id) ? NoContent() : NotFound();
}
