using GraphApi.Models.USR.CuartaAutomoviles;
using GraphApi.Models.USR.Marcas;
using GraphApi.Services.USR.CuartaAutomoviles;
using GraphApi.Services.USR.Marcas;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GraphApi.Controllers.USR.Marcas;

[ApiController]
[Authorize]
[Route("USR/[controller]")]
[Produces("application/json")]
public class MarcasController(
    ICuartaAutomovilesService cuarta,
    IMarcasService legacy) : ControllerBase
{
    // ── Cuarta ───────────────────────────────────────────────────────────────

    /// <summary>Lista marcas de vehículos (sin headers legacy).</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<MarcaDto>), 200)]
    public async Task<IActionResult> GetMarcas(CancellationToken ct)
        => Ok(await cuarta.ListarMarcasAsync(ct));

    // ── Legacy ────────────────────────────────────────────────────────────────

    [HttpGet("legacy")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> GetLegacy(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromQuery] int? marcaID, [FromQuery] string? marca, [FromQuery] bool? bEliminado, [FromQuery] string? columnNames)
    {
        var list = await legacy.GetMarcasDynamic(marcaID, marca, bEliminado, columnNames, nUserId, sWindowName);
        return list.Count() == 0 ? NotFound() : Ok(list);
    }

    [HttpPost("legacy")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> CreateLegacy(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromBody] clCreateMarcas obj)
    {
        var created = await legacy.CreateMarcas(obj, nUserId, sWindowName);
        return created is null ? NoContent() : Ok(created);
    }

    [HttpPatch("legacy")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> PatchLegacy(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromBody] clUpdateMarcas obj)
    {
        var updated = await legacy.UpdateMarcas(obj, nUserId, sWindowName);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("legacy/{id:int}")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> DeleteLegacy(int id)
    {
        var ok = await legacy.DeleteMarcas(id);
        return ok ? NoContent() : NotFound();
    }
}
