using GraphApi.Models.USR.CuartaAutomoviles;
using GraphApi.Models.USR.Modelos;
using GraphApi.Services.USR.CuartaAutomoviles;
using GraphApi.Services.USR.Modelos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GraphApi.Controllers.USR.Modelos;

[ApiController]
[Authorize]
[Route("USR/[controller]")]
[Produces("application/json")]
public class ModelosController(
    ICuartaAutomovilesService cuarta,
    IModelosService legacy) : ControllerBase
{
    // ── Cuarta ───────────────────────────────────────────────────────────────

    /// <summary>Lista modelos de vehículos (sin headers legacy).</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ModeloDto>), 200)]
    public async Task<IActionResult> GetModelos(CancellationToken ct)
        => Ok(await cuarta.ListarModelosAsync(ct));

    // ── Legacy ────────────────────────────────────────────────────────────────

    [HttpGet("legacy")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> GetLegacy(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromQuery] int? modeloID, [FromQuery] string? modelo, [FromQuery] int? marcaID,
        [FromQuery] bool? bEliminado, [FromQuery] string? columnNames)
    {
        var list = await legacy.GetModelosDynamic(modeloID, marcaID, modelo, bEliminado, columnNames, nUserId, sWindowName);
        return list.Count() == 0 ? NotFound() : Ok(list);
    }

    [HttpPost("legacy")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> CreateLegacy(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromBody] clCreateModelos obj)
    {
        var created = await legacy.CreateModelos(obj, nUserId, sWindowName);
        return created is null ? NoContent() : Ok(created);
    }

    [HttpPatch("legacy")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> PatchLegacy(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromBody] clUpdateModelos obj)
    {
        var updated = await legacy.UpdateModelos(obj, nUserId, sWindowName);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("legacy/{id:int}")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> DeleteLegacy(int id)
    {
        var ok = await legacy.DeleteModelos(id);
        return ok ? NoContent() : NotFound();
    }
}
