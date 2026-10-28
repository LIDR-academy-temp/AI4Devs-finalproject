using System.Security.Claims;
using GraphApi.Models.USR.Automoviles;
using GraphApi.Models.USR.CuartaAutomoviles;
using GraphApi.Services.USR.Automoviles;
using GraphApi.Services.USR.CuartaAutomoviles;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GraphApi.Controllers.USR.Automoviles;

[ApiController]
[Authorize]
[Route("USR/[controller]")]
[Produces("application/json")]
public class AutomovilesController(
    ICuartaAutomovilesService cuarta,
    IAutomovilesService legacy) : ControllerBase
{
    // ── Cuarta ────────────────────────────────────────────────────────────────

    /// <summary>Lista los vehículos propios del residente autenticado.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AutomovilListItemDto>), 200)]
    public async Task<IActionResult> GetMis(CancellationToken ct)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var lista  = await cuarta.ListarMisAsync(userId, ct);
        return Ok(lista);
    }

    /// <summary>Busca vehículos por placas. Solo Admin/Guardia.</summary>
    [HttpGet("buscar")]
    [Authorize(Policy = "AdminOGuardia")]
    [ProducesResponseType(typeof(IReadOnlyList<AutomovilListItemDto>), 200)]
    public async Task<IActionResult> Buscar([FromQuery] string placas, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(placas))
            return BadRequest(new { code = "VEH_PLACAS_REQUERIDAS", detail = "El parámetro placas es obligatorio." });
        var lista = await cuarta.BuscarPorPlacasAsync(placas, ct);
        return Ok(lista);
    }

    /// <summary>Padrón completo de vehículos. Solo administrador.</summary>
    [HttpGet("padron")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(IReadOnlyList<AutomovilListItemDto>), 200)]
    public async Task<IActionResult> Padron(CancellationToken ct)
        => Ok(await cuarta.ListarPadronAsync(ct));

    /// <summary>Registra un vehículo para un residente (admin).</summary>
    [HttpPost("admin")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(AutomovilListItemDto), 201)]
    [ProducesResponseType(409)]
    [ProducesResponseType(422)]
    public async Task<IActionResult> CrearAdmin([FromBody] AutomovilCrearAdminRequest body, CancellationToken ct)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var correo = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("correo") ?? "";
        var (auto, code, status, detail) = await cuarta.CrearParaUsuarioAsync(body, correo, userId, ct);
        if (auto is null)
            return StatusCode(status, new { code, detail });
        return StatusCode(201, auto);
    }

    /// <summary>Actualiza un vehículo (admin, sin validar propietario JWT).</summary>
    [HttpPut("{id:int}/admin")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(204)]
    [ProducesResponseType(404)]
    [ProducesResponseType(409)]
    public async Task<IActionResult> ActualizarAdmin(int id, [FromBody] AutomovilActualizarRequest body, CancellationToken ct)
    {
        var correo = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("correo") ?? "";
        var (ok, code, status, detail) = await cuarta.ActualizarComoAdminAsync(id, body, correo, ct);
        if (!ok) return StatusCode(status, new { code, detail });
        return NoContent();
    }

    /// <summary>Elimina un vehículo (admin).</summary>
    [HttpDelete("{id:int}/admin")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(204)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> EliminarAdmin(int id, CancellationToken ct)
    {
        var correo = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("correo") ?? "";
        var (ok, code, status, detail) = await cuarta.EliminarComoAdminAsync(id, correo, ct);
        if (!ok) return StatusCode(status, new { code, detail });
        return NoContent();
    }

    /// <summary>Registra un nuevo vehículo para el residente autenticado.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(AutomovilListItemDto), 201)]
    [ProducesResponseType(409)]
    [ProducesResponseType(422)]
    public async Task<IActionResult> Crear([FromBody] AutomovilCrearRequest body, CancellationToken ct)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var correo = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("correo") ?? "";
        var (auto, code, status, detail) = await cuarta.CrearAsync(body, correo, userId, ct);
        if (auto is null)
            return StatusCode(status, new { code, detail });
        return CreatedAtAction(nameof(GetMis), auto);
    }

    /// <summary>Actualiza un vehículo propio.</summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType(204)]
    [ProducesResponseType(404)]
    [ProducesResponseType(409)]
    public async Task<IActionResult> Actualizar(int id, [FromBody] AutomovilActualizarRequest body, CancellationToken ct)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var correo = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("correo") ?? "";
        var (ok, code, status, detail) = await cuarta.ActualizarAsync(id, body, correo, userId, ct);
        if (!ok) return StatusCode(status, new { code, detail });
        return NoContent();
    }

    /// <summary>Elimina (soft delete) un vehículo propio.</summary>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(204)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Eliminar(int id, CancellationToken ct)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var correo = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("correo") ?? "";
        var (ok, code, status, detail) = await cuarta.EliminarAsync(id, correo, userId, ct);
        if (!ok) return StatusCode(status, new { code, detail });
        return NoContent();
    }

    // ── Legacy ────────────────────────────────────────────────────────────────

    [HttpGet("legacy")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> GetLegacy(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromQuery] int? automovilID, [FromQuery] int? usuarioID,
        [FromQuery] string? placas, [FromQuery] string? color,
        [FromQuery] bool? bEliminado, [FromQuery] string? columnNames)
    {
        var list = await legacy.GetAutomovilesDynamic(automovilID, usuarioID, null, null, null, null, null, null, placas, color, bEliminado, columnNames, nUserId, sWindowName);
        return list.Count() == 0 ? NotFound() : Ok(list);
    }

    [HttpPost("legacy")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> CreateLegacy(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromBody] clCreateAutomoviles obj)
    {
        var created = await legacy.CreateAutomoviles(obj, nUserId, sWindowName);
        return created is null ? NoContent() : Ok(created);
    }

    [HttpPatch("legacy")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> PatchLegacy(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromBody] clUpdateAutomoviles obj)
    {
        var updated = await legacy.UpdateAutomoviles(obj, nUserId, sWindowName);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("legacy/{id:int}")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> DeleteLegacy(int id)
    {
        var ok = await legacy.DeleteAutomoviles(id);
        return ok ? NoContent() : NotFound();
    }
}
