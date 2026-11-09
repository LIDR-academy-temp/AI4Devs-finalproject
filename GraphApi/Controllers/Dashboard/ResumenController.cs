using FluentValidation;
using GraphApi.Models.Dashboard;
using GraphApi.Services.Dashboard.Kpi;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Controllers.Dashboard.Resumen;

/// <summary>
/// KPIs Admin y resumen Residente (DASH-BE-014).
/// </summary>
[ApiController]
[Authorize]
[Route("Dashboard/[controller]")]
[Produces("application/json")]
[SwaggerTag("Resumen dashboard Fase 1")]
public class ResumenController : ControllerBase
{
    private readonly IDashboardKpiService _kpi;
    private readonly IValidator<ResumenPeriodoQuery> _validator;

    public ResumenController(
        IDashboardKpiService kpi,
        IValidator<ResumenPeriodoQuery> validator)
    {
        _kpi = kpi;
        _validator = validator;
    }

    /// <summary>
    /// Resumen por perfil: ADMIN o RESIDENTE.
    /// </summary>
    [HttpGet]
    [SwaggerOperation(Summary = "KPIs dashboard", Description = "Admin: KPIs operativos; Residente: tickets, cuota del mes, notificaciones.")]
    [ProducesResponseType(typeof(ResumenAdminDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ResumenResidenteDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get([FromQuery] int? mes, [FromQuery] int? anio, CancellationToken ct)
    {
        var query = new ResumenPeriodoQuery { Mes = mes, Anio = anio };
        var validation = await _validator.ValidateAsync(query, ct);
        if (!validation.IsValid)
        {
            return Problem(
                detail: string.Join("; ", validation.Errors.Select(e => e.ErrorMessage)),
                statusCode: StatusCodes.Status400BadRequest,
                title: "VALIDATION_ERROR",
                extensions: new Dictionary<string, object?> { ["code"] = "VALIDATION_ERROR" });
        }

        var (body, code, status, detail) = await _kpi.GetResumenAsync(User, query, ct);
        if (status == StatusCodes.Status401Unauthorized)
        {
            return Unauthorized();
        }

        if (status == StatusCodes.Status403Forbidden)
        {
            return Problem(
                detail: detail,
                statusCode: status,
                title: code,
                extensions: new Dictionary<string, object?> { ["code"] = code });
        }

        return Ok(body);
    }
}
