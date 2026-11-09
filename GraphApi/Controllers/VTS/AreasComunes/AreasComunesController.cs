using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GraphApi.Infrastructure.Security;
using GraphApi.Models.VTS.CuartaVisitas;
using GraphApi.Services.VTS.CuartaVisitas;
using GraphApi.Services.VTS.AreasComunes;
using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Controllers.VTS.AreasComunes;

[ApiController]
[Authorize]
[Route("VTS/[controller]")]
[Produces("application/json")]
[SwaggerTag("Áreas comunes del condominio")]
public class AreasComunesController(
    ICuartaVisitasService cuarta,
    IAreasComunesService legacy) : ControllerBase
{
    private int UserId => JwtUserContext.TryGetUsuarioId(User, out var uid) ? uid : 0;
    private string UserEmail => JwtUserContext.GetCorreo(User) ?? "sistema";

    /// <summary>Lista todas las áreas comunes.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AreaComunDto>), 200)]
    public async Task<IActionResult> Listar(CancellationToken ct)
        => Ok(await cuarta.ListarAreasAsync(ct));

    /// <summary>Crea un área común (admin).</summary>
    [HttpPost]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(AreaComunDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Crear([FromBody] AreaComunUpsertRequest body, CancellationToken ct)
    {
        var (data, code, status, detail) = await cuarta.CrearAreaComunAsync(body, UserEmail, UserId, ct);
        if (data is null) return StatusCode(status, new { code, detail });
        return StatusCode(StatusCodes.Status201Created, data);
    }

    /// <summary>Actualiza un área común (admin).</summary>
    [HttpPut("{id:int}")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(AreaComunDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Actualizar(int id, [FromBody] AreaComunUpsertRequest body, CancellationToken ct)
    {
        var (data, code, status, detail) = await cuarta.ActualizarAreaComunAsync(id, body, UserEmail, UserId, ct);
        if (data is null) return StatusCode(status, new { code, detail });
        return Ok(data);
    }

    /// <summary>Elimina (soft) un área común (admin).</summary>
    [HttpDelete("{id:int}")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Eliminar(int id, CancellationToken ct)
    {
        var (ok, code, status, detail) = await cuarta.EliminarAreaComunAsync(id, UserEmail, UserId, ct);
        if (!ok) return StatusCode(status, new { code, detail });
        return NoContent();
    }

    // Legacy
    [HttpGet("legacy")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> LegacyGet(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromQuery] int? areasComunesID, [FromQuery] string? areasComunes,
        [FromQuery] bool? bEliminado, [FromQuery] string? columnNames)
    {
        var list = await legacy.GetAreasComunesDynamic(areasComunesID, areasComunes, null, null, null, bEliminado, columnNames, nUserId, sWindowName);
        return list.Any() ? Ok(list) : NotFound();
    }
}
