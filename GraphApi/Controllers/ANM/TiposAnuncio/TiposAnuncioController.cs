using GraphApi.Models.ANM.Anuncios;
using GraphApi.Models.ANM.TiposAnuncio;
using GraphApi.Services.ANM.Anuncios;
using GraphApi.Services.ANM.TiposAnuncio;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Controllers.ANM.TiposAnuncio;

[ApiController]
[Authorize]
[Route("ANM/[controller]")]
[Produces("application/json")]
[SwaggerTag("Operaciones sobre TiposAnuncios")]
public class TiposAnuncioController : Controller
{
    private readonly ITiposAnuncioService _legacy;
    private readonly ICuartaAnunciosService _cuarta;

    public TiposAnuncioController(ITiposAnuncioService legacy, ICuartaAnunciosService cuarta)
    {
        _legacy = legacy;
        _cuarta = cuarta;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<TipoAnuncioItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Listar(CancellationToken ct)
    {
        var list = await _cuarta.ListarTiposAsync(ct);
        return Ok(list);
    }

    [HttpGet("legacy")]
    public async Task<ActionResult<IEnumerable<clReadTiposAnuncio>>> GetAllLegacy(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromQuery] int? tipoAnuncioID,
        [FromQuery] string? tipoAnuncio,
        [FromQuery] bool? bEliminado,
        [FromQuery] string? columnNames)
    {
        var vList = await _legacy.GetTiposAnunciosDynamic(
            tipoAnuncioID, tipoAnuncio, bEliminado, columnNames, nUserId, sWindowName);
        return vList.Count() == 0 ? NotFound() : Ok(vList);
    }

    [HttpPost("legacy")]
    public async Task<ActionResult<clReadTiposAnuncio>> CreateLegacy(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromBody] clCreateTiposAnuncio objInput)
    {
        var vCreated = await _legacy.CreateTiposAnuncio(objInput, nUserId, sWindowName);
        return vCreated is null ? NoContent() : vCreated;
    }

    [HttpPatch("legacy")]
    public async Task<ActionResult<clReadTiposAnuncio>> PatchLegacy(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromBody] clUpdateTiposAnuncio objInput)
    {
        var vUpdated = await _legacy.UpdateTiposAnuncio(objInput, nUserId, sWindowName);
        return vUpdated is null ? NotFound() : Ok(vUpdated);
    }

    [HttpDelete("legacy/{nTiposAnuncioID:int}")]
    public async Task<IActionResult> DeleteLegacy(int nTiposAnuncioID)
    {
        var success = await _legacy.DeleteTiposAnuncio(nTiposAnuncioID);
        return success ? NoContent() : NotFound();
    }
}
