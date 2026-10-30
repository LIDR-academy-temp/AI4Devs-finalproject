using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using GraphApi.Infrastructure.Security;
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
    private int AdminId => JwtUserContext.TryGetUsuarioId(User, out var aid) ? aid : 0;
    private string AdminEmail => JwtUserContext.GetCorreo(User) ?? "sistema";

    // ── Cuarta ───────────────────────────────────────────────────────────────

    /// <summary>Lista marcas de vehículos (sin headers legacy).</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<MarcaDto>), 200)]
    public async Task<IActionResult> GetMarcas(CancellationToken ct)
        => Ok(await cuarta.ListarMarcasAsync(ct));

    [HttpPost]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(MarcaDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Post([FromBody] MarcaUpsertRequest body, CancellationToken ct)
    {
        var (data, code, status, detail) = await cuarta.CrearMarcaAsync(body.Marca, AdminId, AdminEmail, ct);
        if (data is null) return StatusCode(status, new { code, detail });
        return StatusCode(201, data);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(MarcaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Put(int id, [FromBody] MarcaUpsertRequest body, CancellationToken ct)
    {
        var (data, code, status, detail) = await cuarta.ActualizarMarcaAsync(id, body.Marca, AdminId, AdminEmail, ct);
        if (data is null) return StatusCode(status, new { code, detail });
        return Ok(data);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var (ok, code, status, detail) = await cuarta.EliminarMarcaAsync(id, AdminId, AdminEmail, ct);
        if (!ok) return StatusCode(status, new { code, detail });
        return NoContent();
    }

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
