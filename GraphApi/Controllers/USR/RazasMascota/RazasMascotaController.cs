using System.Security.Claims;
using GraphApi.Models.USR.CuartaMascotas;
using GraphApi.Services.USR.CuartaMascotas;
using GraphApi.Services.USR.RazasMascota;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GraphApi.Controllers.USR.RazasMascota;

[ApiController]
[Authorize]
[Route("USR/[controller]")]
[Produces("application/json")]
public class RazasMascotaController(ICuartaMascotasService cuarta, IRazasMascotaService legacy) : ControllerBase
{
    private int AdminId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string AdminEmail => User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue(ClaimTypes.Name) ?? "sistema";

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<RazaMascotaDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(CancellationToken ct)
        => Ok(await cuarta.ListarRazasAsync(ct));

    [HttpPost]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(RazaMascotaDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Post([FromBody] RazaMascotaUpsertRequest body, CancellationToken ct)
    {
        var (data, code, status, detail) = await cuarta.CrearRazaAsync(body.TipoMascotaId, body.RazaMascota, AdminId, AdminEmail, ct);
        if (data is null) return StatusCode(status, new { code, detail });
        return StatusCode(201, data);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(RazaMascotaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Put(int id, [FromBody] RazaMascotaUpsertRequest body, CancellationToken ct)
    {
        var (data, code, status, detail) = await cuarta.ActualizarRazaAsync(id, body.TipoMascotaId, body.RazaMascota, AdminId, AdminEmail, ct);
        if (data is null) return StatusCode(status, new { code, detail });
        return Ok(data);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var (ok, code, status, detail) = await cuarta.EliminarRazaAsync(id, AdminId, AdminEmail, ct);
        if (!ok) return StatusCode(status, new { code, detail });
        return NoContent();
    }

    // Legacy
    [HttpGet("legacy")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> LegacyGet(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromQuery] int? razaMascotaID, [FromQuery] int? tipoMascotaID,
        [FromQuery] string? razaMascota, [FromQuery] bool? bEliminado, [FromQuery] string? columnNames)
    {
        var list = await legacy.GetRazasMascotasDynamic(razaMascotaID, tipoMascotaID, razaMascota, bEliminado, columnNames, nUserId, sWindowName);
        return list.Any() ? Ok(list) : NotFound();
    }

    [HttpPost("legacy")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> LegacyPost(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromBody] GraphApi.Models.USR.RazasMascota.clCreateRazasMascota input)
    {
        var c = await legacy.CreateRazasMascota(input, nUserId, sWindowName);
        return c is null ? NoContent() : Ok(c);
    }

    [HttpPatch("legacy")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> LegacyPatch(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromBody] GraphApi.Models.USR.RazasMascota.clUpdateRazasMascota input)
    {
        var u = await legacy.UpdateRazasMascota(input, nUserId, sWindowName);
        return u is null ? NotFound() : Ok(u);
    }

    [HttpDelete("legacy/{id:int}")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> LegacyDelete(int id)
    {
        var ok = await legacy.DeleteRazasMascota(id);
        return ok ? NoContent() : NotFound();
    }
}
