using GraphApi.Models.ENC.Encuestas;
using GraphApi.Models.ENC.TiposPregunta;
using GraphApi.Services.ENC.Encuestas;
using GraphApi.Services.ENC.TiposPregunta;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Controllers.ENC.TiposPregunta;

[ApiController]
[Authorize]
[Route("ENC/[controller]")]
[Produces("application/json")]
[SwaggerTag("Operaciones sobre TiposPreguntas")]
public class TiposPreguntaController : Controller
{
    private readonly ITiposPreguntaService _legacy;
    private readonly ICuartaEncuestasService _cuarta;

    public TiposPreguntaController(ITiposPreguntaService legacy, ICuartaEncuestasService cuarta)
    {
        _legacy = legacy;
        _cuarta = cuarta;
    }

    [HttpGet]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(IEnumerable<TipoPreguntaItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Listar(CancellationToken ct)
    {
        var list = await _cuarta.ListarTiposPreguntaAsync(ct);
        return Ok(list);
    }

    [HttpGet("legacy")]
    public async Task<ActionResult<IEnumerable<clReadTiposPregunta>>> GetAllLegacy(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromQuery] int? tipoPreguntaID,
        [FromQuery] string? tipoPregunta,
        [FromQuery] bool? bEliminado,
        [FromQuery] string? columnNames)
    {
        var vList = await _legacy.GetTiposPreguntasDynamic(
            tipoPreguntaID, tipoPregunta, bEliminado, columnNames, nUserId, sWindowName);
        return vList.Count() == 0 ? NotFound() : Ok(vList);
    }

    [HttpPost("legacy")]
    public async Task<ActionResult<clReadTiposPregunta>> CreateLegacy(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromBody] clCreateTiposPregunta objInput)
    {
        var vCreated = await _legacy.CreateTiposPregunta(objInput, nUserId, sWindowName);
        return vCreated is null ? NoContent() : vCreated;
    }

    [HttpPatch("legacy")]
    public async Task<ActionResult<clReadTiposPregunta>> PatchLegacy(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromBody] clUpdateTiposPregunta objInput)
    {
        var vUpdated = await _legacy.UpdateTiposPregunta(objInput, nUserId, sWindowName);
        return vUpdated is null ? NotFound() : Ok(vUpdated);
    }

    [HttpDelete("legacy/{nTiposPreguntaID:int}")]
    public async Task<IActionResult> DeleteLegacy(int nTiposPreguntaID)
    {
        var success = await _legacy.DeleteTiposPregunta(nTiposPreguntaID);
        return success ? NoContent() : NotFound();
    }
}
