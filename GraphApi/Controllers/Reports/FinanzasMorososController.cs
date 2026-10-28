using FluentValidation;
using GraphApi.Models.FNZ;
using GraphApi.Services.FNZ;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GraphApi.Controllers.Reports;

[ApiController]
[Authorize]
[Route("Reports/Reportes")]
[Produces("application/json")]
public sealed class FinanzasMorososController : Controller
{
    private readonly IFinanzasService _finanzas;
    private readonly IValidator<MorososQuery> _queryValidator;

    public FinanzasMorososController(
        IFinanzasService finanzas,
        IValidator<MorososQuery> queryValidator)
    {
        _finanzas = finanzas;
        _queryValidator = queryValidator;
    }

    [HttpGet("Morosos")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(IReadOnlyList<MorosoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Morosos([FromQuery] int? mes, [FromQuery] int? anio, CancellationToken ct)
    {
        var query = new MorososQuery { Mes = mes, Anio = anio };
        var validation = await _queryValidator.ValidateAsync(query, ct);
        if (!validation.IsValid)
        {
            return Problem(
                detail: validation.Errors.First().ErrorMessage,
                statusCode: StatusCodes.Status400BadRequest,
                title: "VALIDATION_ERROR",
                extensions: new Dictionary<string, object?> { ["code"] = "VALIDATION_ERROR" });
        }

        var items = await _finanzas.ObtenerMorososAsync(mes, anio, ct);
        return Ok(items);
    }
}
