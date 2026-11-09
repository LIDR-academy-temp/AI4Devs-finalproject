using GraphApi.Infrastructure.Security;
using GraphApi.Services.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GraphApi.Controllers.Reports;

[ApiController]
[Authorize]
[Route("Reports/Reportes")]
public sealed class ReportesPeriodoController : Controller
{
    private readonly IBiKpiSnapshotService _bi;

    public ReportesPeriodoController(IBiKpiSnapshotService bi) => _bi = bi;

    [HttpGet("FinanzasMes/export")]
    [Authorize(Policy = "SoloAdministrador")]
    public async Task<IActionResult> FinanzasMes(
        [FromQuery] int mes,
        [FromQuery] int anio,
        [FromQuery] string formato = "pdf",
        CancellationToken ct = default)
    {
        if (mes is < 1 or > 12 || anio < 2020)
        {
            return ValidationProblem();
        }

        if (!JwtUserContext.TryGetCondominioId(User, out var condominioId))
        {
            return Problem(
                detail: "condominioId no disponible en el token",
                statusCode: StatusCodes.Status400BadRequest,
                title: "VALIDATION_ERROR",
                extensions: new Dictionary<string, object?> { ["code"] = "VALIDATION_ERROR" });
        }

        var (bytes, contentType, fileName) = await _bi.ExportFinanzasMesAsync(condominioId, mes, anio, formato, ct);
        return File(bytes, contentType, fileName);
    }

    [HttpGet("TicketsPeriodo/export")]
    [Authorize(Policy = "SoloAdministrador")]
    public async Task<IActionResult> TicketsPeriodo(
        [FromQuery] int mes,
        [FromQuery] int anio,
        [FromQuery] string formato = "pdf",
        CancellationToken ct = default)
    {
        if (mes is < 1 or > 12 || anio < 2020)
        {
            return ValidationProblem();
        }

        if (!JwtUserContext.TryGetCondominioId(User, out var condominioId))
        {
            return Problem(
                detail: "condominioId no disponible en el token",
                statusCode: StatusCodes.Status400BadRequest,
                title: "VALIDATION_ERROR",
                extensions: new Dictionary<string, object?> { ["code"] = "VALIDATION_ERROR" });
        }

        var (bytes, contentType, fileName) = await _bi.ExportTicketsPeriodoAsync(condominioId, mes, anio, formato, ct);
        return File(bytes, contentType, fileName);
    }
}
