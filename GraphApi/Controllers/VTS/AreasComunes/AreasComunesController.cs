using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GraphApi.Models.VTS.CuartaVisitas;
using GraphApi.Services.VTS.CuartaVisitas;
using GraphApi.Services.VTS.AreasComunes;
using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Controllers.VTS.AreasComunes;

[ApiController]
[Authorize]
[Route("VTS/[controller]")]
[Produces("application/json")]
[SwaggerTag("Áreas comunes del condominio")]
public class AreasComunesController(
    ICuartaVisitasService cuarta,
    IAreasComunesService legacy) : ControllerBase
{
    /// <summary>Lista todas las áreas comunes.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AreaComunDto>), 200)]
    public async Task<IActionResult> Listar(CancellationToken ct)
        => Ok(await cuarta.ListarAreasAsync(ct));

    // Legacy
    [HttpGet("legacy")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> LegacyGet(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromQuery] int? areasComunesID, [FromQuery] string? areasComunes,
        [FromQuery] bool? bEliminado, [FromQuery] string? columnNames)
    {
        var list = await legacy.GetAreasComunesDynamic(areasComunesID, areasComunes, null, null, null, bEliminado, columnNames, nUserId, sWindowName);
        return list.Any() ? Ok(list) : NotFound();
    }
}
