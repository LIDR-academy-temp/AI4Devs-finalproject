using System.Security.Claims;
using GraphApi.Models.USR.CuartaMascotas;
using GraphApi.Services.USR.CuartaMascotas;
using GraphApi.Services.USR.Mascotas;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GraphApi.Controllers.USR.Mascotas;

[ApiController]
[Authorize]
[Route("USR/[controller]")]
[Produces("application/json")]
public class MascotasController(ICuartaMascotasService cuarta, IMascotasService legacy) : ControllerBase
{
    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string UserEmail => User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue(ClaimTypes.Name) ?? "sistema";

    // ─── CUARTA ────────────────────────────────────────────────────────────────

    /// <summary>Lista las mascotas del residente autenticado.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<MascotaListItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMis(CancellationToken ct)
    {
        var items = await cuarta.ListarMisAsync(UserId, ct);
        return Ok(items);
    }

    /// <summary>Padrón completo de mascotas — solo administrador.</summary>
    [HttpGet("padron")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(IReadOnlyList<MascotaListItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPadron(CancellationToken ct)
    {
        var items = await cuarta.ListarPadronAsync(ct);
        return Ok(items);
    }

    /// <summary>Registra una mascota para un residente (admin).</summary>
    [HttpPost("admin")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(MascotaListItemDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> CrearAdmin([FromBody] MascotaCrearAdminRequest body, CancellationToken ct)
    {
        var adminId = UserId;
        var (mascota, code, status, detail) = await cuarta.CrearParaUsuarioAsync(body, UserEmail, adminId, ct);
        if (mascota is null)
            return StatusCode(status, new { code, detail });
        return StatusCode(201, mascota);
    }

    /// <summary>Actualiza una mascota (admin).</summary>
    [HttpPut("{id:int}/admin")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ActualizarAdmin(int id, [FromBody] MascotaActualizarRequest body, CancellationToken ct)
    {
        var (ok, code, status, detail) = await cuarta.ActualizarComoAdminAsync(id, body, UserEmail, ct);
        if (!ok) return StatusCode(status, new { code, detail });
        return NoContent();
    }

    /// <summary>Elimina una mascota (admin).</summary>
    [HttpDelete("{id:int}/admin")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> EliminarAdmin(int id, CancellationToken ct)
    {
        var (ok, code, status, detail) = await cuarta.EliminarComoAdminAsync(id, UserEmail, ct);
        if (!ok) return StatusCode(status, new { code, detail });
        return NoContent();
    }

    /// <summary>Registra una nueva mascota para el residente autenticado.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(object), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Post([FromBody] MascotaCrearRequest req, CancellationToken ct)
    {
        var (status, id, error) = await cuarta.CrearAsync(req, UserEmail, UserId, ct);
        return status switch
        {
            201 => StatusCode(201, new { mascotaId = id }),
            422 => UnprocessableEntity(new { code = "VALIDACION", detail = error }),
            _   => StatusCode(status)
        };
    }

    /// <summary>Actualiza una mascota del residente autenticado.</summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Put(int id, [FromBody] MascotaActualizarRequest req, CancellationToken ct)
    {
        var (status, error) = await cuarta.ActualizarAsync(id, req, UserEmail, UserId, ct);
        return status switch
        {
            204 => NoContent(),
            404 => NotFound(new { code = "NOT_FOUND", detail = error }),
            _   => StatusCode(status)
        };
    }

    /// <summary>Elimina (soft-delete) una mascota del residente autenticado.</summary>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var (status, error) = await cuarta.EliminarAsync(id, UserEmail, UserId, ct);
        return status switch
        {
            204 => NoContent(),
            404 => NotFound(new { code = "NOT_FOUND", detail = error }),
            _   => StatusCode(status)
        };
    }

    // ─── LEGACY ────────────────────────────────────────────────────────────────

    [HttpGet("legacy")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> LegacyGet(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromQuery] int? mascotaID, [FromQuery] int? usuarioID, [FromQuery] string? nombreMascota,
        [FromQuery] int? tipoMascotaID, [FromQuery] int? razaMascotaID, [FromQuery] bool? bEliminado,
        [FromQuery] string? columnNames)
    {
        var list = await legacy.GetMascotasDynamic(mascotaID, usuarioID, null, null, nombreMascota,
            tipoMascotaID, null, razaMascotaID, null, null, bEliminado, columnNames, nUserId, sWindowName);
        return list.Any() ? Ok(list) : NotFound();
    }

    [HttpPost("legacy")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> LegacyPost(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromBody] GraphApi.Models.USR.Mascotas.clCreateMascotas input)
    {
        var created = await legacy.CreateMascotas(input, nUserId, sWindowName);
        return created is null ? NoContent() : Ok(created);
    }

    [HttpPatch("legacy")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> LegacyPatch(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromBody] GraphApi.Models.USR.Mascotas.clUpdateMascotas input)
    {
        var updated = await legacy.UpdateMascotas(input, nUserId, sWindowName);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("legacy/{id:int}")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> LegacyDelete(int id)
    {
        var ok = await legacy.DeleteMascotas(id);
        return ok ? NoContent() : NotFound();
    }
}
