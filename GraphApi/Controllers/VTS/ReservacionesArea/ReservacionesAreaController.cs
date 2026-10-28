using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FluentValidation;
using GraphApi.Models.TKT;
using GraphApi.Models.VTS.CuartaVisitas;
using GraphApi.Services.VTS.CuartaVisitas;
using GraphApi.Services.VTS.ReservacionesArea;
using Swashbuckle.AspNetCore.Annotations;
using System.Security.Claims;

namespace GraphApi.Controllers.VTS.ReservacionesArea;

[ApiController]
[Authorize]
[Route("VTS/[controller]")]
[Produces("application/json")]
[SwaggerTag("Reservaciones de áreas comunes")]
public class ReservacionesAreaController(
    ICuartaVisitasService cuarta,
    IReservacionesAreaService legacy,
    IValidator<ReservacionAdminFiltroDto> adminFiltroValidator) : ControllerBase
{
    /// <summary>Crea una reservación de área común para el residente autenticado.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(ReservacionAreaDto), 201)]
    [ProducesResponseType(409)]
    [ProducesResponseType(422)]
    public async Task<IActionResult> Crear([FromBody] CrearReservacionRequest request, CancellationToken ct)
    {
        var correo = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("correo") ?? "";
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

        var (reservacion, code, status, detail) = await cuarta.CrearReservacionAsync(request, correo, userId, ct);
        if (reservacion is null) return Problem(detail: detail, statusCode: status, title: code);
        return StatusCode(201, reservacion);
    }

    /// <summary>Lista las reservaciones del residente autenticado.</summary>
    [HttpGet("mias")]
    [ProducesResponseType(typeof(IReadOnlyList<ReservacionAreaDto>), 200)]
    public async Task<IActionResult> Mias(CancellationToken ct)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
        var list = await cuarta.ListarReservacionesMiasAsync(userId, ct);
        return Ok(list);
    }

    /// <summary>Ocupación comunitaria del área en un rango (calendario).</summary>
    [HttpGet("calendario")]
    [ProducesResponseType(typeof(IReadOnlyList<ReservacionCalendarioDto>), 200)]
    [ProducesResponseType(422)]
    public async Task<IActionResult> Calendario(
        [FromQuery] int areaComunId,
        [FromQuery] DateTime desde,
        [FromQuery] DateTime hasta,
        CancellationToken ct)
    {
        var (eventos, code, status, detail) =
            await cuarta.ListarReservacionesCalendarioAsync(areaComunId, desde, hasta, ct);
        if (eventos is null) return Problem(detail: detail, statusCode: status, title: code);
        return Ok(eventos);
    }

    /// <summary>Lista paginada de reservaciones del condominio (solo administrador).</summary>
    [HttpGet("admin")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(PaginaDto<ReservacionAdminItemDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Admin(
        [FromQuery] int? areaComunId,
        [FromQuery] DateTime? desde,
        [FromQuery] DateTime? hasta,
        [FromQuery] int pagina = 1,
        [FromQuery] int tamano = 20,
        CancellationToken ct = default)
    {
        var filtro = new ReservacionAdminFiltroDto
        {
            AreaComunId = areaComunId,
            Desde = desde,
            Hasta = hasta,
            Pagina = pagina,
            Tamano = tamano,
        };

        var validation = await adminFiltroValidator.ValidateAsync(filtro, ct);
        if (!validation.IsValid)
        {
            return Problem(
                detail: string.Join("; ", validation.Errors.Select(e => e.ErrorMessage)),
                statusCode: StatusCodes.Status400BadRequest,
                title: "VALIDATION_ERROR",
                extensions: new Dictionary<string, object?> { ["code"] = "VALIDATION_ERROR" });
        }

        var page = await cuarta.ListarReservacionesAdminAsync(filtro, ct);
        return Ok(page);
    }

    // Legacy
    [HttpGet("legacy")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> LegacyGet(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromQuery] string? columnNames)
    {
        var list = await legacy.GetReservacionesAreasDynamic(
            null, null, null, null, null, null, null, null, null, null, null, null, null,
            columnNames, nUserId, sWindowName);
        return list.Any() ? Ok(list) : NotFound();
    }
}
