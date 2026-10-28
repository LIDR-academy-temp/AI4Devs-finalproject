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
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<RazaMascotaDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(CancellationToken ct)
        => Ok(await cuarta.ListarRazasAsync(ct));

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
