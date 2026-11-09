using GraphApi.Infrastructure.Security;
using GraphApi.Services.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GraphApi.Controllers.Reports;

[ApiController]
[Authorize]
[Route("Reports/Bi")]
[Produces("application/json")]
public sealed class BiTendenciasController : Controller
{
    private readonly IBiKpiSnapshotService _bi;

    public BiTendenciasController(IBiKpiSnapshotService bi) => _bi = bi;

    [HttpGet("tendencias")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Tendencias([FromQuery] int meses = 6, CancellationToken ct = default)
    {
        if (!JwtUserContext.TryGetCondominioId(User, out var condominioId))
        {
            return Problem(
                detail: "condominioId no disponible en el token",
                statusCode: StatusCodes.Status400BadRequest,
                title: "VALIDATION_ERROR",
                extensions: new Dictionary<string, object?> { ["code"] = "VALIDATION_ERROR" });
        }

        var data = await _bi.GetTendenciasAsync(condominioId, meses, ct);
        return Ok(data);
    }

    [HttpGet("export")]
    [Authorize(Policy = "SoloAdministrador")]
    public async Task<IActionResult> Export(
        [FromQuery] int meses = 6,
        [FromQuery] string formato = "pdf",
        CancellationToken ct = default)
    {
        if (!JwtUserContext.TryGetCondominioId(User, out var condominioId))
        {
            return Problem(
                detail: "condominioId no disponible en el token",
                statusCode: StatusCodes.Status400BadRequest,
                title: "VALIDATION_ERROR",
                extensions: new Dictionary<string, object?> { ["code"] = "VALIDATION_ERROR" });
        }

        var (bytes, contentType, fileName) = string.Equals(formato, "xlsx", StringComparison.OrdinalIgnoreCase)
            ? await _bi.ExportBiExcelAsync(condominioId, meses, ct)
            : await _bi.ExportBiPdfAsync(condominioId, meses, ct);

        return File(bytes, contentType, fileName);
    }
}
