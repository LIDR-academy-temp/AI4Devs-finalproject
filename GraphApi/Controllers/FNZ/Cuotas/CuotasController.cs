using FluentValidation;
using GraphApi.Infrastructure.Security;
using GraphApi.Models.FNZ;
using GraphApi.Models.FNZ.Cuotas;
using GraphApi.Services.FNZ;
using GraphApi.Services.FNZ.Cuotas;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Controllers.FNZ.Cuotas;

/// <summary>
/// Gestión de Cuotas: consulta, creación, actualización y borrado.
/// </summary>
[ApiController]
[Authorize]
[Route("FNZ/[controller]")]
[Produces("application/json")]
[SwaggerTag("Operaciones sobre Cuotas")]
public class CuotasController : Controller
{
    private readonly ICuotasService _objService;
    private readonly IFinanzasService _finanzas;
    private readonly IValidator<GenerarCuotasRequest> _generarValidator;
    private readonly IValidator<RegistrarPagoRequest> _pagoValidator;

    public CuotasController(
        ICuotasService objService,
        IFinanzasService finanzas,
        IValidator<GenerarCuotasRequest> generarValidator,
        IValidator<RegistrarPagoRequest> pagoValidator)
    {
        _objService = objService;
        _finanzas = finanzas;
        _generarValidator = generarValidator;
        _pagoValidator = pagoValidator;
    }

    [HttpPost("generar")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(GenerarCuotasResultDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GenerarCuotas([FromBody] GenerarCuotasRequest request, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
        {
            return Unauthorized();
        }

        var validation = await _generarValidator.ValidateAsync(request, ct);
        if (!validation.IsValid)
        {
            return ValidationProblem(new ValidationProblemDetails(
                validation.Errors.GroupBy(e => e.PropertyName)
                    .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray())));
        }

        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var (data, code, status, detail) =
            await _finanzas.GenerarCuotasPeriodoAsync(request, adminId, correo, ct);

        if (data is null)
        {
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
        }

        return Ok(data);
    }

    [HttpGet("generaciones/admin")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(IReadOnlyList<PeriodoCuotasGeneradoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListarGeneraciones(CancellationToken ct)
    {
        var list = await _finanzas.ListarPeriodosGeneradosAdminAsync(ct);
        return Ok(list);
    }

    [HttpPatch("{cuotaId:int}/pago")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> RegistrarPago(int cuotaId, [FromBody] RegistrarPagoRequest request, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
        {
            return Unauthorized();
        }

        var validation = await _pagoValidator.ValidateAsync(request, ct);
        if (!validation.IsValid)
        {
            return ValidationProblem(new ValidationProblemDetails(
                validation.Errors.GroupBy(e => e.PropertyName)
                    .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray())));
        }

        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var (ok, code, status, detail) =
            await _finanzas.RegistrarPagoAsync(cuotaId, request, adminId, correo, ct);

        if (!ok)
        {
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
        }

        return NoContent();
    }

    [HttpGet("mis")]
    [ProducesResponseType(typeof(EstadoCuentaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMisCuotas(CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var usuarioId))
        {
            return Unauthorized();
        }

        var estado = await _finanzas.ObtenerEstadoCuentaAsync(usuarioId, ct);
        return Ok(estado);
    }

    [HttpGet]
    [ProducesResponseType(typeof(EstadoCuentaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetEstadoCuentaAdmin([FromQuery] int? usuarioId, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out _))
        {
            return Unauthorized();
        }

        if (!JwtUserContext.EsAdministrador(User))
        {
            return Problem(
                detail: null,
                statusCode: StatusCodes.Status403Forbidden,
                title: "FORBIDDEN",
                extensions: new Dictionary<string, object?> { ["code"] = "FORBIDDEN" });
        }

        if (usuarioId is null or <= 0)
        {
            return Problem(
                detail: "usuarioId es obligatorio",
                statusCode: StatusCodes.Status400BadRequest,
                title: "VALIDATION_ERROR",
                extensions: new Dictionary<string, object?> { ["code"] = "VALIDATION_ERROR" });
        }

        var estado = await _finanzas.ObtenerEstadoCuentaAsync(usuarioId.Value, ct);
        return Ok(estado);
    }

    [HttpGet("cuentas")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(IReadOnlyList<CuentaFnzCatalogoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListarCuentas(CancellationToken ct)
    {
        var list = await _finanzas.ListarCuentasCatalogoAsync(ct);
        return Ok(list);
    }

    /// <summary>
    /// Obtiene todos los Cuotas, con filtros opcionales (legacy).
    /// </summary>
    [HttpGet("legacy")]
    [SwaggerOperation(
        Summary = "Listar Cuotas",
        Description = "Devuelve Cuotas aplicando filtros opcionales."
    )]
    [ProducesResponseType(typeof(IEnumerable<clReadCuotas>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<clReadCuotas>>> GetAll(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromQuery] int? cuotaID,
        [FromQuery] int? usuarioID,
        [FromQuery] int? casaID,
        [FromQuery] decimal? monto,
        [FromQuery] DateTime? periodoInicio,
        [FromQuery] DateTime? periodoFin,
        [FromQuery] DateTime? fechaVencimiento,
        [FromQuery] bool? pagado,
        [FromQuery] DateTime? fechaPago,
        [FromQuery] string? metodoPago,
        [FromQuery] string? referenciaPago,
        [FromQuery] bool? bEliminado,
        [FromQuery] string? columnNames)
    {
        var vList = await _objService.GetCuotasDynamic(
            cuotaID,
            usuarioID,
            casaID,
            monto,
            periodoInicio,
            periodoFin,
            fechaVencimiento,
            pagado,
            fechaPago,
            metodoPago,
            referenciaPago,
            bEliminado,
            columnNames,
            nUserId,
            sWindowName);
        return !vList.Any() ? NotFound() : Ok(vList);
    }

    [HttpPost]
    [SwaggerOperation(
        Summary = "Crear Cuotas",
        Description = "Inserta un nuevo Cuota en la base de datos."
    )]
    [ProducesResponseType(typeof(clReadCuotas), StatusCodes.Status201Created)]
    public async Task<ActionResult<clReadCuotas>> Create(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromBody] clCreateCuotas objInput)
    {
        var vCreated = await _objService.CreateCuotas(objInput, nUserId, sWindowName);
        return vCreated is null ? NoContent() : vCreated;
    }

    [HttpPatch]
    [SwaggerOperation(
        Summary = "Actualizar Cuotas",
        Description = "Actualiza uno o varios campos de Cuota existente."
    )]
    [ProducesResponseType(typeof(clReadCuotas), StatusCodes.Status200OK)]
    public async Task<ActionResult<clReadCuotas>> Patch(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromBody] clUpdateCuotas objInput)
    {
        var vUpdated = await _objService.UpdateCuotas(objInput, nUserId, sWindowName);
        return vUpdated is null ? NotFound() : Ok(vUpdated);
    }

    [HttpDelete("{nCuotasID:int}")]
    [SwaggerOperation(
        Summary = "Eliminar Cuota",
        Description = "Borra un Cuota si existe."
    )]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(int nCuotasID)
    {
        var success = await _objService.DeleteCuotas(nCuotasID);
        return success ? NoContent() : NotFound();
    }
}
