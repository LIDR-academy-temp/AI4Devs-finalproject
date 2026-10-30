using FluentValidation;
using GraphApi.Infrastructure.Security;
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
    private readonly IValidator<AplicarMorasRequest> _aplicarMorasValidator;
    private readonly IValidator<CondonarMorasRequest> _condonarMorasValidator;

    public FinanzasMorososController(
        IFinanzasService finanzas,
        IValidator<MorososQuery> queryValidator,
        IValidator<AplicarMorasRequest> aplicarMorasValidator,
        IValidator<CondonarMorasRequest> condonarMorasValidator)
    {
        _finanzas = finanzas;
        _queryValidator = queryValidator;
        _aplicarMorasValidator = aplicarMorasValidator;
        _condonarMorasValidator = condonarMorasValidator;
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

    [HttpPost("Morosos/moras/aplicar")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(MorasBatchResultDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> AplicarMoras([FromBody] AplicarMorasRequest request, CancellationToken ct)
    {
        var validation = await _aplicarMorasValidator.ValidateAsync(request, ct);
        if (!validation.IsValid)
        {
            return Problem(
                detail: validation.Errors.First().ErrorMessage,
                statusCode: StatusCodes.Status400BadRequest,
                title: "VALIDATION_ERROR",
                extensions: new Dictionary<string, object?> { ["code"] = "VALIDATION_ERROR" });
        }

        var (adminId, correo) = RequireAdmin();
        if (adminId is null)
        {
            return Unauthorized();
        }

        var (data, code, status, detail) =
            await _finanzas.AplicarMorasMorososAsync(request, adminId.Value, correo!, ct);

        if (data is null)
        {
            return Problem(
                detail: detail,
                statusCode: status,
                title: code,
                extensions: new Dictionary<string, object?> { ["code"] = code });
        }

        return Ok(data);
    }

    [HttpPost("Morosos/moras/condonar")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(MorasBatchResultDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> CondonarMoras([FromBody] CondonarMorasRequest request, CancellationToken ct)
    {
        var validation = await _condonarMorasValidator.ValidateAsync(request, ct);
        if (!validation.IsValid)
        {
            return Problem(
                detail: validation.Errors.First().ErrorMessage,
                statusCode: StatusCodes.Status400BadRequest,
                title: "VALIDATION_ERROR",
                extensions: new Dictionary<string, object?> { ["code"] = "VALIDATION_ERROR" });
        }

        var (adminId, correo) = RequireAdmin();
        if (adminId is null)
        {
            return Unauthorized();
        }

        var (data, code, status, detail) =
            await _finanzas.CondonarMorasMorososAsync(request, adminId.Value, correo!, ct);

        if (data is null)
        {
            return Problem(
                detail: detail,
                statusCode: status,
                title: code,
                extensions: new Dictionary<string, object?> { ["code"] = code });
        }

        return Ok(data);
    }

    private (int? AdminId, string? Correo) RequireAdmin()
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
        {
            return (null, null);
        }

        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        return (adminId, correo);
    }
}
