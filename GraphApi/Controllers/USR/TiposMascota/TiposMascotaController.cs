using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using GraphApi.Infrastructure.Security;
using GraphApi.Models.USR.CuartaMascotas;
using GraphApi.Services.USR.CuartaMascotas;
using GraphApi.Services.USR.TiposMascota;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GraphApi.Controllers.USR.TiposMascota;

[ApiController]
[Authorize]
[Route("USR/[controller]")]
[Produces("application/json")]
public class TiposMascotaController(ICuartaMascotasService cuarta, ITiposMascotaService legacy) : ControllerBase
{
    private int AdminId => JwtUserContext.TryGetUsuarioId(User, out var aid) ? aid : 0;
    private string AdminEmail => JwtUserContext.GetCorreo(User) ?? "sistema";

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<TipoMascotaDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(CancellationToken ct)
        => Ok(await cuarta.ListarTiposAsync(ct));

    [HttpPost]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(TipoMascotaDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Post([FromBody] TipoMascotaUpsertRequest body, CancellationToken ct)
    {
        var (data, code, status, detail) = await cuarta.CrearTipoAsync(body.TipoMascota, AdminId, AdminEmail, ct);
        if (data is null) return StatusCode(status, new { code, detail });
        return StatusCode(201, data);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(TipoMascotaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Put(int id, [FromBody] TipoMascotaUpsertRequest body, CancellationToken ct)
    {
        var (data, code, status, detail) = await cuarta.ActualizarTipoAsync(id, body.TipoMascota, AdminId, AdminEmail, ct);
        if (data is null) return StatusCode(status, new { code, detail });
        return Ok(data);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var (ok, code, status, detail) = await cuarta.EliminarTipoAsync(id, AdminId, AdminEmail, ct);
        if (!ok) return StatusCode(status, new { code, detail });
        return NoContent();
    }

    // Legacy
    [HttpGet("legacy")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> LegacyGet(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromQuery] int? tipoMascotaID, [FromQuery] string? tipoMascota,
        [FromQuery] bool? bEliminado, [FromQuery] string? columnNames)
    {
        var list = await legacy.GetTiposMascotasDynamic(tipoMascotaID, tipoMascota, bEliminado, columnNames, nUserId, sWindowName);
        return list.Any() ? Ok(list) : NotFound();
    }

    [HttpPost("legacy")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> LegacyPost(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromBody] GraphApi.Models.USR.TiposMascota.clCreateTiposMascota input)
    {
        var c = await legacy.CreateTiposMascota(input, nUserId, sWindowName);
        return c is null ? NoContent() : Ok(c);
    }

    [HttpPatch("legacy")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> LegacyPatch(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromBody] GraphApi.Models.USR.TiposMascota.clUpdateTiposMascota input)
    {
        var u = await legacy.UpdateTiposMascota(input, nUserId, sWindowName);
        return u is null ? NotFound() : Ok(u);
    }

    [HttpDelete("legacy/{id:int}")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> LegacyDelete(int id)
    {
        var ok = await legacy.DeleteTiposMascota(id);
        return ok ? NoContent() : NotFound();
    }
}
