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
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<TipoMascotaDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(CancellationToken ct)
        => Ok(await cuarta.ListarTiposAsync(ct));

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
